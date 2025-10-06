import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DocumentationMapper } from './DocumentationMapper';
import { AgentConfig, APIElement, APIDiff } from '../types';

describe('DocumentationMapper', () => {
  const testDir = path.join(__dirname, '../../test-docs');
  let mapper: DocumentationMapper;
  let config: AgentConfig;

  beforeEach(() => {
    // Create test directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test documentation files
    fs.writeFileSync(
      path.join(testDir, 'api.md'),
      `# API Documentation

## getUserById

This function retrieves a user by their ID.

\`\`\`typescript
const user = getUserById(123);
console.log(user.name);
\`\`\`

The getUserById function is essential for user management.
`
    );

    fs.writeFileSync(
      path.join(testDir, 'guide.md'),
      `# User Guide

## Working with Users

You can fetch users using the fetchUser helper.

\`\`\`javascript
import { fetchUser } from './api';

const result = fetchUser('user-123');
\`\`\`
`
    );

    fs.writeFileSync(
      path.join(testDir, 'README.md'),
      `# Project README

This project includes getUserById and other utilities.
`
    );

    config = {
      documentationPaths: [testDir],
      codePaths: ['src/**/*.ts'],
      ignorePaths: ['node_modules/**'],
      autoApprove: false,
      minSeverity: 'minor',
      generateMissingDocs: false,
      llmProvider: 'openai',
      llmModel: 'gpt-4',
      temperature: 0.3,
      documentationFormat: 'markdown',
      mode: 'manual',
    };

    mapper = new DocumentationMapper(config);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialize', () => {
    it('should scan and index markdown files', async () => {
      await mapper.initialize();

      const indexedFiles = mapper.getIndexedFiles();
      expect(indexedFiles).toHaveLength(3);
      expect(indexedFiles.some((f) => f.endsWith('api.md'))).toBe(true);
      expect(indexedFiles.some((f) => f.endsWith('guide.md'))).toBe(true);
      expect(indexedFiles.some((f) => f.endsWith('README.md'))).toBe(true);
    });

    it('should read file content correctly', async () => {
      await mapper.initialize();

      const apiContent = mapper.getFileContent(path.join(testDir, 'api.md'));
      expect(apiContent).toContain('getUserById');
      expect(apiContent).toContain('API Documentation');
    });

    it('should handle non-existent directories gracefully', async () => {
      const emptyConfig = {
        ...config,
        documentationPaths: ['/non/existent/path'],
      };
      const emptyMapper = new DocumentationMapper(emptyConfig);

      await emptyMapper.initialize();
      expect(emptyMapper.getIndexedFiles()).toHaveLength(0);
    });
  });

  describe('findReferences', () => {
    beforeEach(async () => {
      await mapper.initialize();
    });

    it('should find exact name matches in documentation', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'getUserById',
        signature: 'getUserById(id: number): User',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const references = await mapper.findReferences(apiElement);

      // Should find 4 references: 3 in api.md (heading + code + text) and 1 in README.md
      expect(references.length).toBe(4);
      expect(references.some((r) => r.filePath.endsWith('api.md'))).toBe(true);
      expect(references.some((r) => r.filePath.endsWith('README.md'))).toBe(true);
    });

    it('should include line numbers and context', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'getUserById',
        signature: 'getUserById(id: number): User',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const references = await mapper.findReferences(apiElement);
      const apiRef = references.find((r) => r.filePath.endsWith('api.md'));

      expect(apiRef).toBeDefined();
      expect(apiRef!.lineNumber).toBeGreaterThan(0);
      expect(apiRef!.context).toContain('getUserById');
      expect(apiRef!.referenceType).toBe('name');
    });

    it('should use word boundaries to avoid partial matches', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'getUser',
        signature: 'getUser(): User',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const references = await mapper.findReferences(apiElement);

      // Should not match 'getUserById' when searching for 'getUser'
      expect(references).toHaveLength(0);
    });

    it('should return empty array when no references found', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'nonExistentFunction',
        signature: 'nonExistentFunction(): void',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const references = await mapper.findReferences(apiElement);
      expect(references).toHaveLength(0);
    });
  });

  describe('findCodeExamples', () => {
    beforeEach(async () => {
      await mapper.initialize();
    });

    it('should extract code blocks from markdown', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'getUserById',
        signature: 'getUserById(id: number): User',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const examples = await mapper.findCodeExamples(apiElement);

      // Should find 1 code example in api.md
      expect(examples).toHaveLength(1);
      const apiExample = examples.find((e) => e.filePath.endsWith('api.md'));
      expect(apiExample).toBeDefined();
      expect(apiExample!.code).toContain('getUserById(123)');
      expect(apiExample!.language).toBe('typescript');
    });

    it('should include line numbers for code blocks', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'getUserById',
        signature: 'getUserById(id: number): User',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const examples = await mapper.findCodeExamples(apiElement);
      const apiExample = examples.find((e) => e.filePath.endsWith('api.md'));

      expect(apiExample).toBeDefined();
      expect(apiExample!.startLine).toBe(8);
      expect(apiExample!.endLine).toBe(9);
    });

    it('should detect language tags in code fences', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'fetchUser',
        signature: 'fetchUser(id: string): Promise<User>',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const examples = await mapper.findCodeExamples(apiElement);
      const guideExample = examples.find((e) => e.filePath.endsWith('guide.md'));

      expect(guideExample).toBeDefined();
      expect(guideExample!.language).toBe('javascript');
    });

    it('should return empty array when API not found in code examples', async () => {
      const apiElement: APIElement = {
        type: 'function',
        name: 'nonExistentFunction',
        signature: 'nonExistentFunction(): void',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
        isPublic: true,
      };

      const examples = await mapper.findCodeExamples(apiElement);
      expect(examples).toHaveLength(0);
    });
  });

  describe('mapAffectedDocs', () => {
    beforeEach(async () => {
      await mapper.initialize();
    });

    it('should map all affected documentation files', async () => {
      const diff: APIDiff = {
        added: [],
        removed: [],
        modified: [
          {
            old: {
              type: 'function',
              name: 'getUserById',
              signature: 'getUserById(id: number): User',
              location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
              isPublic: true,
            },
            new: {
              type: 'function',
              name: 'getUserById',
              signature: 'getUserById(id: string): User',
              location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
              isPublic: true,
            },
            changes: [
              {
                type: 'parameters',
                description: 'Parameter type changed from number to string',
              },
            ],
          },
        ],
        unchanged: [],
      };

      const result = await mapper.mapAffectedDocs(diff);

      // Should find 2 files (api.md and README.md) with 4 total references
      expect(result.files.size).toBe(2);
      expect(result.totalReferences).toBe(4);
    });

    it('should group references by file', async () => {
      const diff: APIDiff = {
        added: [],
        removed: [],
        modified: [
          {
            old: {
              type: 'function',
              name: 'getUserById',
              signature: 'getUserById(id: number): User',
              location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
              isPublic: true,
            },
            new: {
              type: 'function',
              name: 'getUserById',
              signature: 'getUserById(id: string): User',
              location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
              isPublic: true,
            },
            changes: [],
          },
        ],
        unchanged: [],
      };

      const result = await mapper.mapAffectedDocs(diff);

      for (const [filePath, docFile] of result.files) {
        expect(docFile.path).toBe(filePath);
        expect(docFile.content).toBeTruthy();
        expect(Array.isArray(docFile.references)).toBe(true);
        expect(Array.isArray(docFile.examples)).toBe(true);
      }
    });

    it('should identify missing documentation for public APIs', async () => {
      const diff: APIDiff = {
        added: [
          {
            type: 'function',
            name: 'newPublicFunction',
            signature: 'newPublicFunction(): void',
            location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
            isPublic: true,
          },
        ],
        removed: [],
        modified: [],
        unchanged: [],
      };

      const result = await mapper.mapAffectedDocs(diff);

      expect(result.missingDocs).toHaveLength(1);
      expect(result.missingDocs[0].name).toBe('newPublicFunction');
    });

    it('should not flag private APIs as missing docs', async () => {
      const diff: APIDiff = {
        added: [
          {
            type: 'function',
            name: 'privateHelper',
            signature: 'privateHelper(): void',
            location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
            isPublic: false,
          },
        ],
        removed: [],
        modified: [],
        unchanged: [],
      };

      const result = await mapper.mapAffectedDocs(diff);

      expect(result.missingDocs).toHaveLength(0);
    });

    it('should handle multiple API changes', async () => {
      const diff: APIDiff = {
        added: [
          {
            type: 'function',
            name: 'getUserById',
            signature: 'getUserById(id: number): User',
            location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
            isPublic: true,
          },
        ],
        removed: [
          {
            type: 'function',
            name: 'fetchUser',
            signature: 'fetchUser(id: string): Promise<User>',
            location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
            isPublic: true,
          },
        ],
        modified: [],
        unchanged: [],
      };

      const result = await mapper.mapAffectedDocs(diff);

      // Should find 4 references for getUserById and 3 for fetchUser = 7 total across 3 files
      expect(result.totalReferences).toBe(7);
      expect(result.files.size).toBe(3);
    });
  });
});
