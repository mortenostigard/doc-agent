import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIDocumentationGenerator } from './AIDocumentationGenerator';
import type { DocumentationContext, DocumentationUpdate, APIElement, DocFile } from '../types';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'APIError';
    }
  }

  const MockAnthropic: any = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  }));

  MockAnthropic.APIError = MockAPIError;

  return { default: MockAnthropic };
});

describe('AIDocumentationGenerator', () => {
  let generator: AIDocumentationGenerator;

  const createMockContext = (): DocumentationContext => ({
    codeChanges: {
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
    },
    affectedFiles: [],
    styleGuide: {
      tone: 'Direct and instructional',
      formatting: 'Standard markdown',
      conventions: ['Uses JSDoc-style annotations'],
      examplePatterns: ['Usage snippets'],
    },
    projectContext: {
      language: 'TypeScript',
      documentationFormat: 'markdown',
    },
    examples: [],
  });

  const createMockDocFile = (content: string = '# API Documentation'): DocFile => ({
    path: 'docs/api.md',
    content,
    references: [],
    examples: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Use maxRetries=1 to avoid retry logic in tests
    generator = new AIDocumentationGenerator('test-api-key', 'claude-3-5-sonnet-20241022', 0.3, 1);
  });

  describe('constructor', () => {
    it('should throw error if no API key provided', () => {
      expect(() => new AIDocumentationGenerator('')).toThrow('Anthropic API key is required');
    });

    it('should initialize with default model and temperature', () => {
      const gen = new AIDocumentationGenerator('test-key');
      expect(gen).toBeDefined();
    });

    it('should accept custom model and temperature', () => {
      const gen = new AIDocumentationGenerator('test-key', 'claude-3-opus-20240229', 0.5);
      expect(gen).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should detect empty content as error', () => {
      const update: DocumentationUpdate = {
        filePath: 'test.md',
        originalContent: 'original',
        updatedContent: '',
        changes: [],
        reasoning: 'test',
      };

      const result = generator.validate(update);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Updated content is empty');
    });

    it('should warn when content is identical', () => {
      const update: DocumentationUpdate = {
        filePath: 'test.md',
        originalContent: '# Same content',
        updatedContent: '# Same content',
        changes: [],
        reasoning: 'test',
      };

      const result = generator.validate(update);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Updated content is identical to original');
    });

    it('should warn when all headers are removed', () => {
      const update: DocumentationUpdate = {
        filePath: 'test.md',
        originalContent: '# Header\n## Subheader\nContent',
        updatedContent: 'Content only',
        changes: [],
        reasoning: 'test',
      };

      const result = generator.validate(update);

      expect(result.warnings).toContain('All markdown headers were removed');
    });

    it('should warn when all code examples are removed', () => {
      const update: DocumentationUpdate = {
        filePath: 'test.md',
        originalContent: '# API\n```js\ncode();\n```',
        updatedContent: '# API\nNo code',
        changes: [],
        reasoning: 'test',
      };

      const result = generator.validate(update);

      expect(result.warnings).toContain('All code examples were removed');
    });

    it('should pass validation for valid updates', () => {
      const update: DocumentationUpdate = {
        filePath: 'test.md',
        originalContent: '# API\nOld description',
        updatedContent: '# API\nNew description',
        changes: [],
        reasoning: 'test',
      };

      const result = generator.validate(update);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateUpdate', () => {
    it('should generate update with valid LLM response', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              updatedContent: '# Updated Documentation\n\nNew content here.',
              reasoning: 'Updated to reflect API changes',
              changes: [],
            }),
          },
        ],
      });

      const docFile = createMockDocFile();
      const context = createMockContext();

      const result = await generator.generateUpdate(docFile, context);

      expect(result.updatedContent).toBe('# Updated Documentation\n\nNew content here.');
      expect(result.reasoning).toBe('Updated to reflect API changes');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should parse JSON from code fence', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```json\n{"updatedContent": "# Doc", "reasoning": "test"}\n```',
          },
        ],
      });

      const result = await generator.generateUpdate(createMockDocFile(), createMockContext());

      expect(result.updatedContent).toBe('# Doc');
    });

    it('should fallback to markdown extraction on parse error', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```markdown\n# Fallback Content\n```',
          },
        ],
      });

      const result = await generator.generateUpdate(createMockDocFile(), createMockContext());

      expect(result.updatedContent).toBe('# Fallback Content');
      expect(result.reasoning).toBe('Parsed from unstructured response');
    });

    it('should retry on failure', async () => {
      const retryGenerator = new AIDocumentationGenerator(
        'test-key',
        'claude-3-5-sonnet-20241022',
        0.3,
        3
      );

      mockCreate
        .mockRejectedValueOnce(new Error('API error'))
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                updatedContent: '# Success',
                reasoning: 'test',
              }),
            },
          ],
        });

      const result = await retryGenerator.generateUpdate(createMockDocFile(), createMockContext());

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(result.updatedContent).toBe('# Success');
    });

    it('should throw after max retries', async () => {
      mockCreate.mockRejectedValue(new Error('Persistent API error'));

      await expect(
        generator.generateUpdate(createMockDocFile(), createMockContext())
      ).rejects.toThrow('Failed to generate update after 1 attempts');

      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateNewDoc', () => {
    const mockAPIElement: APIElement = {
      type: 'function',
      name: 'testFunction',
      signature: 'function testFunction(param: string): void',
      location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 0 },
      isPublic: true,
    };

    it('should generate new documentation', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```markdown\n# testFunction\n\nA test function.\n```',
          },
        ],
      });

      const result = await generator.generateNewDoc(mockAPIElement, createMockContext());

      expect(result).toContain('testFunction');
      expect(result).toContain('A test function');
    });

    it('should extract from generic code blocks', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '```\n# New Documentation\n```',
          },
        ],
      });

      const result = await generator.generateNewDoc(mockAPIElement, createMockContext());

      expect(result).toBe('# New Documentation');
    });

    it('should return raw response if no code blocks', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '# Plain Documentation',
          },
        ],
      });

      const result = await generator.generateNewDoc(mockAPIElement, createMockContext());

      expect(result).toBe('# Plain Documentation');
    });

    it('should retry on failure', async () => {
      const retryGenerator = new AIDocumentationGenerator(
        'test-key',
        'claude-3-5-sonnet-20241022',
        0.3,
        2
      );

      mockCreate.mockRejectedValueOnce(new Error('API error')).mockResolvedValueOnce({
        content: [{ type: 'text', text: '# Success' }],
      });

      const result = await retryGenerator.generateNewDoc(mockAPIElement, createMockContext());

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result).toBe('# Success');
    });
  });

  describe('prompt building', () => {
    it('should include style guidelines in system prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"updatedContent": "# Doc", "reasoning": "test"}' }],
      });

      const context = createMockContext();
      context.styleGuide.tone = 'Friendly and casual';
      context.styleGuide.conventions = ['Uses examples', 'Short paragraphs'];

      await generator.generateUpdate(createMockDocFile(), context);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('Friendly and casual');
      expect(callArgs.system).toContain('Uses examples');
      expect(callArgs.system).toContain('Short paragraphs');
    });

    it('should include code changes in user prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"updatedContent": "# Doc", "reasoning": "test"}' }],
      });

      const context = createMockContext();
      context.codeChanges.added = [
        {
          type: 'function',
          name: 'newFunc',
          signature: 'function newFunc(): void',
          location: { startLine: 1, endLine: 1, startColumn: 0, endColumn: 0 },
          isPublic: true,
        },
      ];

      await generator.generateUpdate(createMockDocFile(), context);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('newFunc');
      expect(callArgs.messages[0].content).toContain('Added APIs');
    });

    it('should include references in prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"updatedContent": "# Doc", "reasoning": "test"}' }],
      });

      const docFile = createMockDocFile();
      docFile.references = [
        {
          filePath: 'docs/api.md',
          lineNumber: 10,
          context: 'Use the myFunction() method',
          referenceType: 'name',
        },
      ];

      await generator.generateUpdate(docFile, createMockContext());

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('References Found');
      expect(callArgs.messages[0].content).toContain('myFunction');
    });

    it('should include code examples in prompt', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"updatedContent": "# Doc", "reasoning": "test"}' }],
      });

      const docFile = createMockDocFile();
      docFile.examples = [
        {
          filePath: 'docs/api.md',
          code: 'const result = myFunc();',
          language: 'typescript',
          startLine: 15,
          endLine: 17,
        },
      ];

      await generator.generateUpdate(docFile, createMockContext());

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Code Examples Found');
      expect(callArgs.messages[0].content).toContain('const result = myFunc()');
    });
  });

  describe('error handling', () => {
    it('should handle Anthropic API errors', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const apiError = new Anthropic.APIError('Rate limit exceeded');

      mockCreate.mockRejectedValue(apiError);

      await expect(
        generator.generateUpdate(createMockDocFile(), createMockContext())
      ).rejects.toThrow('Failed to generate update after 1 attempts');
    });

    it('should handle missing text content in response', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'image', data: 'base64...' }],
      });

      await expect(
        generator.generateUpdate(createMockDocFile(), createMockContext())
      ).rejects.toThrow();
    });
  });
});
