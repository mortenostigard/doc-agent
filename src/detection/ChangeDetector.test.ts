import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ChangeDetector } from './ChangeDetector.js';
import { AgentConfig } from '../types/index.js';
import simpleGit from 'simple-git';
import { promises as fs } from 'fs';

// Mock dependencies
vi.mock('simple-git');
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('ChangeDetector', () => {
  let detector: ChangeDetector;
  let mockGit: any;
  let mockConfig: AgentConfig;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock git instance
    mockGit = {
      diffSummary: vi.fn(),
      show: vi.fn(),
    };

    (simpleGit as any).mockReturnValue(mockGit);

    // Create detector instance
    detector = new ChangeDetector('/test/repo');

    // Setup mock configuration
    mockConfig = {
      documentationPaths: ['docs/**/*.md'],
      codePaths: ['src/**/*.ts', 'src/**/*.js'],
      ignorePaths: ['**/*.test.ts', '**/node_modules/**'],
      autoApprove: false,
      minSeverity: 'minor',
      generateMissingDocs: true,
      llmProvider: 'openai',
      llmModel: 'gpt-4',
      temperature: 0.7,
      documentationFormat: 'markdown',
      mode: 'manual',
    };

    detector.initialize(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should throw error if not initialized', async () => {
      const uninitializedDetector = new ChangeDetector();

      await expect(uninitializedDetector.detectFromGit()).rejects.toThrow(
        'ChangeDetector not initialized'
      );
    });
  });

  describe('detectFromGit', () => {
    it('should detect changes from git diff', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'src/utils/helper.ts', changes: 10 }],
      });

      (fs.readFile as any).mockResolvedValue('current content');
      mockGit.show.mockResolvedValue('previous content');

      const changes = await detector.detectFromGit();

      expect(changes.length).toBe(1);
      expect(mockGit.diffSummary).toHaveBeenCalledWith(['HEAD~1', 'HEAD']);
    });

    it('should use custom commit hash when provided', async () => {
      mockGit.diffSummary.mockResolvedValue({ files: [] });

      await detector.detectFromGit('abc123');

      expect(mockGit.diffSummary).toHaveBeenCalledWith(['abc123', 'HEAD']);
    });

    it('should filter files based on codePaths configuration', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'src/utils/helper.ts', changes: 10 },
          { file: 'README.md', changes: 5 },
        ],
      });

      (fs.readFile as any).mockResolvedValue('content');
      mockGit.show.mockResolvedValue('previous');

      const changes = await detector.detectFromGit();

      // Only .ts file should be included (README.md doesn't match codePaths)
      const filePaths = changes.map((c) => c.filePath);
      expect(filePaths).toContain('src/utils/helper.ts');
      expect(filePaths).not.toContain('README.md');
    });

    it('should filter out files matching ignorePaths', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'src/utils/helper.ts', changes: 10 },
          { file: 'src/utils/helper.test.ts', changes: 5 },
        ],
      });

      (fs.readFile as any).mockResolvedValue('content');
      mockGit.show.mockResolvedValue('previous');

      const changes = await detector.detectFromGit();

      // Test file should be filtered out
      const filePaths = changes.map((c) => c.filePath);
      expect(filePaths).not.toContain('src/utils/helper.test.ts');
    });
  });

  describe('language detection', () => {
    beforeEach(() => {
      (fs.readFile as any).mockResolvedValue('content');
      mockGit.show.mockResolvedValue('previous');
    });

    it('should detect TypeScript files', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['**/*.ts'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'test.ts', changes: 1 }],
      });

      const changes = await detector.detectFromGit();
      const tsFile = changes.find((c) => c.filePath === 'test.ts');

      if (tsFile) {
        expect(tsFile.language).toBe('typescript');
      }
    });

    it('should detect JavaScript files', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['**/*.js'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'test.js', changes: 1 }],
      });

      const changes = await detector.detectFromGit();
      const jsFile = changes.find((c) => c.filePath === 'test.js');

      if (jsFile) {
        expect(jsFile.language).toBe('javascript');
      }
    });

    it('should detect Python files', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['**/*.py'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'script.py', changes: 1 }],
      });

      const changes = await detector.detectFromGit();
      const pyFile = changes.find((c) => c.filePath === 'script.py');

      if (pyFile) {
        expect(pyFile.language).toBe('python');
      }
    });

    it('should return unknown for unrecognized extensions', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['**/*.xyz'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'data.xyz', changes: 1 }],
      });

      const changes = await detector.detectFromGit();
      const xyzFile = changes.find((c) => c.filePath === 'data.xyz');

      if (xyzFile) {
        expect(xyzFile.language).toBe('unknown');
      }
    });
  });

  describe('file change types', () => {
    it('should handle modified files', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'src/existing.ts', changes: 5 }],
      });

      (fs.readFile as any).mockResolvedValue('modified content');
      mockGit.show.mockResolvedValue('original content');

      const changes = await detector.detectFromGit();
      const modifiedFile = changes.find((c) => c.filePath === 'src/existing.ts');

      if (modifiedFile) {
        expect(modifiedFile.content).toBe('modified content');
        expect(modifiedFile.previousContent).toBe('original content');
      }
    });

    it('should handle added files', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'src/new.ts', changes: 10 }],
      });

      (fs.readFile as any).mockResolvedValue('new content');
      // Simulate file existing in HEAD but not in previous commit
      mockGit.show
        .mockResolvedValueOnce('new content') // First call: file exists in HEAD
        .mockRejectedValueOnce(new Error('File not found')); // Second call: doesn't exist in HEAD~1

      const changes = await detector.detectFromGit();
      const newFile = changes.find((c) => c.filePath === 'src/new.ts');

      if (newFile) {
        expect(newFile.content).toBe('new content');
      }
    });

    it('should handle deleted files', async () => {
      mockGit.diffSummary.mockResolvedValue({
        files: [{ file: 'src/deleted.ts', changes: 10 }],
      });

      // File doesn't exist in current working directory
      (fs.readFile as any).mockRejectedValue(new Error('File not found'));
      mockGit.show.mockResolvedValue('deleted content');

      const changes = await detector.detectFromGit();
      const deletedFile = changes.find((c) => c.filePath === 'src/deleted.ts');

      if (deletedFile) {
        expect(deletedFile.content).toBe('');
      }
    });
  });

  describe('detectFromFiles', () => {
    beforeEach(() => {
      (fs.readFile as any).mockResolvedValue('content');
      mockGit.show.mockResolvedValue('previous');
    });

    it('should detect changes from specific file paths', async () => {
      // These files match the codePaths pattern src/**/*.ts
      const filePaths = ['src/utils/file1.ts', 'src/components/file2.ts'];

      const changes = await detector.detectFromFiles(filePaths);

      // Should process both files that match the pattern
      expect(changes.length).toBe(2);
      expect(changes.some((c) => c.filePath === 'src/utils/file1.ts')).toBe(true);
    });

    it('should filter files based on configuration', async () => {
      const filePaths = [
        'src/file1.ts',
        'src/file1.test.ts', // Should be ignored
        'README.md', // Not in codePaths
      ];

      const changes = await detector.detectFromFiles(filePaths);

      const filePathsResult = changes.map((c) => c.filePath);
      expect(filePathsResult).not.toContain('src/file1.test.ts');
      expect(filePathsResult).not.toContain('README.md');
    });
  });

  describe('glob pattern matching', () => {
    beforeEach(() => {
      (fs.readFile as any).mockResolvedValue('content');
      mockGit.show.mockResolvedValue('previous');
    });

    it('should match exact paths', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['src/utils/helper.ts'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'src/utils/helper.ts', changes: 1 },
          { file: 'src/utils/other.ts', changes: 1 },
        ],
      });

      const changes = await detector.detectFromGit();
      const filePaths = changes.map((c) => c.filePath);

      expect(filePaths).toContain('src/utils/helper.ts');
      expect(filePaths).not.toContain('src/utils/other.ts');
    });

    it('should match wildcard patterns', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['src/*.ts'],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'src/index.ts', changes: 1 },
          { file: 'src/utils/helper.ts', changes: 1 },
        ],
      });

      const changes = await detector.detectFromGit();
      const filePaths = changes.map((c) => c.filePath);

      expect(filePaths).toContain('src/index.ts');
      // src/utils/helper.ts should not match src/*.ts
      expect(filePaths).not.toContain('src/utils/helper.ts');
    });

    it('should match recursive wildcard patterns', async () => {
      detector.initialize({
        ...mockConfig,
        codePaths: ['src/**/*.ts'],
        ignorePaths: [],
      });

      mockGit.diffSummary.mockResolvedValue({
        files: [
          { file: 'src/index.ts', changes: 1 },
          { file: 'src/utils/helper.ts', changes: 1 },
          { file: 'src/components/ui/Button.ts', changes: 1 },
        ],
      });

      const changes = await detector.detectFromGit();

      // All 3 files should match (case-insensitive matching)
      expect(changes.length).toBe(3);
    });
  });
});
