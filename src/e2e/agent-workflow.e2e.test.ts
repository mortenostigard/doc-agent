import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AgentController } from '../controller/AgentController';
import { ConfigManager } from '../config/ConfigManager';
import type { AgentInput } from '../types';

/**
 * Note on testing approach:
 * 
 * We test by calling AgentController directly rather than via CLI subprocess because:
 * 1. The Anthropic SDK doesn't respect baseURL when called from a subprocess
 * 2. Module-level mocking (vi.mock) works reliably for direct function calls
 * 3. We still get true E2E coverage: real git repos, real file I/O, real agent pipeline
 * 4. This approach is faster and more reliable than trying to mock HTTP at the network level
 */

// Mock Anthropic SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            messages: {
                create: vi.fn().mockResolvedValue({
                    id: 'msg_test',
                    type: 'message',
                    role: 'assistant',
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                updatedContent: `# Calculator API

## add(...numbers)

Adds multiple numbers together.

**Parameters:**
- \`...numbers\` (number[]): Numbers to add

**Returns:** Sum of all numbers

**Example:**
\`\`\`typescript
add(5, 3, 2); // Returns 10
\`\`\`
`,
                                reasoning: 'Updated function signature from add(a, b) to add(...numbers)',
                            }),
                        },
                    ],
                    model: 'claude-3-5-sonnet-20250219',
                    stop_reason: 'end_turn',
                    usage: {
                        input_tokens: 100,
                        output_tokens: 50,
                    },
                }),
            },
        })),
    };
});

/**
 * E2E Tests for Agent Workflow
 * 
 * These tests verify the complete agent pipeline end-to-end:
 * 1. Creating a real git repository with code changes
 * 2. Mocking the Anthropic API to return documentation updates
 * 3. Running the full AgentController pipeline
 * 4. Verifying documentation updates, backups, and auto-approve behavior
 */

describe('Agent Workflow E2E Tests', () => {
    let testRepo: tmp.DirResult;
    let repoPath: string;
    let originalCwd: string;

    const oldCode = `
/**
 * Add two numbers
 */
export function add(a: number, b: number): number {
  return a + b;
}
`;

    const newCode = `
/**
 * Add multiple numbers
 */
export function add(...numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0);
}
`;

    const oldDocs = `# Calculator API

## add(a, b)

Adds two numbers together.

**Parameters:**
- \`a\` (number): First number
- \`b\` (number): Second number

**Returns:** Sum of a and b

**Example:**
\`\`\`typescript
add(5, 3); // Returns 8
\`\`\`
`;

    beforeEach(() => {
        // Save original directory
        originalCwd = process.cwd();

        // Create real temporary directory
        testRepo = tmp.dirSync({ unsafeCleanup: true });
        repoPath = testRepo.name;

        // Initialize real git repository
        execSync('git init', { cwd: repoPath });
        execSync('git config user.name "Test User"', { cwd: repoPath });
        execSync('git config user.email "test@example.com"', { cwd: repoPath });

        // Create directory structure
        fs.mkdirSync(path.join(repoPath, 'src'), { recursive: true });
        fs.mkdirSync(path.join(repoPath, 'docs'), { recursive: true });

        // Create config file
        const config = {
            documentationPaths: ['docs/**/*.md'],
            codePaths: ['src/**/*.ts'],
            ignorePaths: ['node_modules/**', 'dist/**'],
            minSeverity: 'minor',
            generateMissingDocs: false,
            llmProvider: 'anthropic',
            llmModel: 'claude-3-5-sonnet-20250219',
            temperature: 0.3,
            documentationFormat: 'markdown',
            mode: 'manual',
        };
        fs.writeFileSync(
            path.join(repoPath, '.doc-agent.config.json'),
            JSON.stringify(config, null, 2)
        );

        // Set API key for tests
        process.env.ANTHROPIC_API_KEY = 'test-key';
    });

    afterEach(() => {
        // Restore original directory
        process.chdir(originalCwd);

        // Cleanup
        testRepo.removeCallback();
    });

    it('should auto-approve and update documentation when autoApprove is true', async () => {
        // 1. Create initial files and commit
        fs.writeFileSync(path.join(repoPath, 'src/calculator.ts'), oldCode);
        fs.writeFileSync(path.join(repoPath, 'docs/calculator.md'), oldDocs);

        execSync('git add .', { cwd: repoPath });
        execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'pipe' });

        // 2. Make API change and commit
        fs.writeFileSync(path.join(repoPath, 'src/calculator.ts'), newCode);
        execSync('git add src/calculator.ts', { cwd: repoPath });
        execSync('git commit -m "Change add function signature"', { cwd: repoPath, stdio: 'pipe' });

        // 3. Load config and create controller
        const configManager = new ConfigManager();
        const config = configManager.load(path.join(repoPath, '.doc-agent.config.json'));

        // Change to the repo directory so git operations work
        process.chdir(repoPath);

        const controller = new AgentController(config);

        // 4. Run the agent with autoApprove enabled
        const input: AgentInput = {
            mode: 'git',
            target: undefined, // Will use HEAD~1
            config,
            autoApprove: true, // This is what we're testing
        };

        const result = await controller.run(input);

        // 5. Verify the result
        expect(result.success).toBe(true);
        expect(result.updatesGenerated).toBe(1);
        expect(result.updatesApplied).toBe(1);
        expect(result.errors.length).toBe(0);

        // 6. Verify the documentation file was actually updated
        const updatedDocContent = fs.readFileSync(
            path.join(repoPath, 'docs/calculator.md'),
            'utf-8'
        );

        // The documentation should reflect the new signature
        expect(updatedDocContent).toContain('add(...numbers)');
        expect(updatedDocContent).toContain('multiple numbers');
        expect(updatedDocContent).not.toContain('add(a, b)');

        // 7. Verify backup file was created
        const backupPath = path.join(repoPath, 'docs/calculator.md.backup');
        expect(fs.existsSync(backupPath)).toBe(true);

        // Backup should contain the old content
        const backupContent = fs.readFileSync(backupPath, 'utf-8');
        expect(backupContent).toBe(oldDocs);
    });

    it('should create backup files before updating documentation', async () => {
        // 1. Create initial files and commit
        fs.writeFileSync(path.join(repoPath, 'src/calculator.ts'), oldCode);
        fs.writeFileSync(path.join(repoPath, 'docs/calculator.md'), oldDocs);

        execSync('git add .', { cwd: repoPath });
        execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'pipe' });

        // 2. Make API change and commit
        fs.writeFileSync(path.join(repoPath, 'src/calculator.ts'), newCode);
        execSync('git add src/calculator.ts', { cwd: repoPath });
        execSync('git commit -m "Change add function signature"', { cwd: repoPath, stdio: 'pipe' });

        // 3. Load config and create controller
        const configManager = new ConfigManager();
        const config = configManager.load(path.join(repoPath, '.doc-agent.config.json'));

        process.chdir(repoPath);

        const controller = new AgentController(config);

        // 4. Verify backup doesn't exist before running
        const backupPath = path.join(repoPath, 'docs/calculator.md.backup');
        expect(fs.existsSync(backupPath)).toBe(false);

        // 5. Run the agent with autoApprove enabled
        const input: AgentInput = {
            mode: 'git',
            target: undefined,
            config,
            autoApprove: true,
        };

        const result = await controller.run(input);

        // 6. Verify backup was created with original content
        expect(fs.existsSync(backupPath)).toBe(true);
        const backupContent = fs.readFileSync(backupPath, 'utf-8');
        expect(backupContent).toBe(oldDocs);

        // 7. Verify the main file was updated
        const updatedContent = fs.readFileSync(path.join(repoPath, 'docs/calculator.md'), 'utf-8');
        expect(updatedContent).not.toBe(oldDocs);
        expect(updatedContent).toContain('add(...numbers)');

        // 8. Verify result indicates success
        expect(result.success).toBe(true);
        expect(result.updatesApplied).toBe(1);
    });

    it('should handle no changes gracefully with autoApprove enabled', async () => {
        // 1. Create initial files and commit
        fs.writeFileSync(path.join(repoPath, 'src/calculator.ts'), oldCode);
        fs.writeFileSync(path.join(repoPath, 'docs/calculator.md'), oldDocs);

        execSync('git add .', { cwd: repoPath });
        execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'pipe' });

        // 2. Make a second commit without code changes
        fs.writeFileSync(path.join(repoPath, 'README.md'), '# Test');
        execSync('git add README.md', { cwd: repoPath });
        execSync('git commit -m "Add README"', { cwd: repoPath, stdio: 'pipe' });

        // 3. Load config and create controller
        const configManager = new ConfigManager();
        const config = configManager.load(path.join(repoPath, '.doc-agent.config.json'));

        process.chdir(repoPath);

        const controller = new AgentController(config);

        // 4. Run the agent
        const input: AgentInput = {
            mode: 'git',
            target: undefined,
            config,
            autoApprove: true,
        };

        const result = await controller.run(input);

        // 5. Verify no updates were made
        expect(result.success).toBe(true);
        expect(result.updatesGenerated).toBe(0);
        expect(result.updatesApplied).toBe(0);

        // 6. Verify documentation wasn't changed
        const docContent = fs.readFileSync(path.join(repoPath, 'docs/calculator.md'), 'utf-8');
        expect(docContent).toBe(oldDocs);

        // 7. Verify no backup was created
        expect(fs.existsSync(path.join(repoPath, 'docs/calculator.md.backup'))).toBe(false);
    });
});
