import { describe, it, expect } from 'vitest';
import { DiffAnalyzer } from './DiffAnalyzer.js';
import { ParsedCode, APIElement } from '../types/index.js';

describe('DiffAnalyzer', () => {
  const analyzer = new DiffAnalyzer();

  // Helper function to create a minimal ParsedCode object
  const createParsedCode = (apis: APIElement[]): ParsedCode => ({
    ast: {},
    apis,
    imports: [],
    exports: [],
  });

  // Helper function to create a minimal APIElement
  const createAPI = (
    name: string,
    signature: string,
    isPublic: boolean = true,
    returnType?: string
  ): APIElement => ({
    type: 'function',
    name,
    signature,
    location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
    isPublic,
    returnType,
    parameters: [],
  });

  describe('analyze', () => {
    it('should identify added APIs', () => {
      const oldCode = createParsedCode([createAPI('foo', 'function foo(): void')]);
      const newCode = createParsedCode([
        createAPI('foo', 'function foo(): void'),
        createAPI('bar', 'function bar(): void'),
      ]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].name).toBe('bar');
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1);
    });

    it('should identify removed APIs', () => {
      const oldCode = createParsedCode([
        createAPI('foo', 'function foo(): void'),
        createAPI('bar', 'function bar(): void'),
      ]);
      const newCode = createParsedCode([createAPI('foo', 'function foo(): void')]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0].name).toBe('bar');
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1);
    });

    it('should identify modified APIs with signature changes', () => {
      const oldCode = createParsedCode([createAPI('foo', 'function foo(): void')]);
      const newCode = createParsedCode([createAPI('foo', 'function foo(x: number): void')]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].old.name).toBe('foo');
      expect(diff.modified[0].new.name).toBe('foo');
      expect(diff.modified[0].changes).toHaveLength(1);
      expect(diff.modified[0].changes[0].type).toBe('signature');
    });

    it('should identify unchanged APIs', () => {
      const oldCode = createParsedCode([createAPI('foo', 'function foo(): void')]);
      const newCode = createParsedCode([createAPI('foo', 'function foo(): void')]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(1);
      expect(diff.unchanged[0].name).toBe('foo');
    });

    it('should handle empty old code', () => {
      const oldCode = createParsedCode([]);
      const newCode = createParsedCode([createAPI('foo', 'function foo(): void')]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(1);
      expect(diff.removed).toHaveLength(0);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });

    it('should handle empty new code', () => {
      const oldCode = createParsedCode([createAPI('foo', 'function foo(): void')]);
      const newCode = createParsedCode([]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.added).toHaveLength(0);
      expect(diff.removed).toHaveLength(1);
      expect(diff.modified).toHaveLength(0);
      expect(diff.unchanged).toHaveLength(0);
    });
  });

  describe('compareAPIs', () => {
    it('should detect return type changes', () => {
      const oldCode = createParsedCode([createAPI('foo', 'function foo(): void', true, 'void')]);
      const newCode = createParsedCode([
        createAPI('foo', 'function foo(): string', true, 'string'),
      ]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.modified).toHaveLength(1);
      const changes = diff.modified[0].changes;
      expect(changes.some((c) => c.type === 'return_type')).toBe(true);
    });

    it('should detect parameter changes', () => {
      const oldAPI: APIElement = {
        type: 'function',
        name: 'foo',
        signature: 'function foo(x: number): void',
        location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
        isPublic: true,
        parameters: [{ name: 'x', type: 'number', optional: false }],
      };

      const newAPI: APIElement = {
        type: 'function',
        name: 'foo',
        signature: 'function foo(x: string): void',
        location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
        isPublic: true,
        parameters: [{ name: 'x', type: 'string', optional: false }],
      };

      const oldCode = createParsedCode([oldAPI]);
      const newCode = createParsedCode([newAPI]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.modified).toHaveLength(1);
      const changes = diff.modified[0].changes;
      expect(changes.some((c) => c.type === 'parameters')).toBe(true);
    });

    it('should detect documentation changes', () => {
      const oldAPI: APIElement = {
        ...createAPI('foo', 'function foo(): void'),
        documentation: 'Old docs',
      };

      const newAPI: APIElement = {
        ...createAPI('foo', 'function foo(): void'),
        documentation: 'New docs',
      };

      const oldCode = createParsedCode([oldAPI]);
      const newCode = createParsedCode([newAPI]);

      const diff = analyzer.analyze(oldCode, newCode);

      expect(diff.modified).toHaveLength(1);
      const changes = diff.modified[0].changes;
      expect(changes.some((c) => c.type === 'documentation')).toBe(true);
    });
  });

  describe('isPublicAPIChange', () => {
    it('should return true when public APIs are added', () => {
      const diff = {
        added: [createAPI('foo', 'function foo(): void', true)],
        removed: [],
        modified: [],
        unchanged: [],
      };

      expect(analyzer.isPublicAPIChange(diff)).toBe(true);
    });

    it('should return true when public APIs are removed', () => {
      const diff = {
        added: [],
        removed: [createAPI('foo', 'function foo(): void', true)],
        modified: [],
        unchanged: [],
      };

      expect(analyzer.isPublicAPIChange(diff)).toBe(true);
    });

    it('should return true when public APIs are modified', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [
          {
            old: createAPI('foo', 'function foo(): void', true),
            new: createAPI('foo', 'function foo(x: number): void', true),
            changes: [{ type: 'signature' as const, description: 'Changed' }],
          },
        ],
        unchanged: [],
      };

      expect(analyzer.isPublicAPIChange(diff)).toBe(true);
    });

    it('should return false when only private APIs change', () => {
      const diff = {
        added: [createAPI('foo', 'function foo(): void', false)],
        removed: [createAPI('bar', 'function bar(): void', false)],
        modified: [],
        unchanged: [],
      };

      expect(analyzer.isPublicAPIChange(diff)).toBe(false);
    });
  });

  describe('calculateSeverity', () => {
    it('should return "breaking" for removed public APIs', () => {
      const diff = {
        added: [],
        removed: [createAPI('foo', 'function foo(): void', true)],
        modified: [],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('breaking');
    });

    it('should return "breaking" for parameter changes in public APIs', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [
          {
            old: createAPI('foo', 'function foo(): void', true),
            new: createAPI('foo', 'function foo(x: number): void', true),
            changes: [{ type: 'parameters' as const, description: 'Changed' }],
          },
        ],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('breaking');
    });

    it('should return "breaking" for return type changes in public APIs', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [
          {
            old: createAPI('foo', 'function foo(): void', true),
            new: createAPI('foo', 'function foo(): string', true),
            changes: [{ type: 'return_type' as const, description: 'Changed' }],
          },
        ],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('breaking');
    });

    it('should return "major" for added public APIs', () => {
      const diff = {
        added: [createAPI('foo', 'function foo(): void', true)],
        removed: [],
        modified: [],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('major');
    });

    it('should return "minor" for non-breaking modifications to public APIs', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [
          {
            old: createAPI('foo', 'function foo(): void', true),
            new: createAPI('foo', 'function foo(): void', true),
            changes: [{ type: 'signature' as const, description: 'Minor change' }],
          },
        ],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('minor');
    });

    it('should return "patch" for documentation changes', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [
          {
            old: createAPI('foo', 'function foo(): void', true),
            new: createAPI('foo', 'function foo(): void', true),
            changes: [{ type: 'documentation' as const, description: 'Updated docs' }],
          },
        ],
        unchanged: [],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('patch');
    });

    it('should return "patch" for no significant changes', () => {
      const diff = {
        added: [],
        removed: [],
        modified: [],
        unchanged: [createAPI('foo', 'function foo(): void', true)],
      };

      expect(analyzer.calculateSeverity(diff)).toBe('patch');
    });
  });
});
