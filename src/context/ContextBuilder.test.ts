import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './ContextBuilder';
import { APIDiff, AffectedDocumentation, AgentConfig, DocFile, CodeExample } from '../types';

describe('ContextBuilder', () => {
  const builder = new ContextBuilder();

  const createMockConfig = (): AgentConfig => ({
    documentationPaths: ['docs/**/*.md'],
    codePaths: ['src/**/*.ts'],
    ignorePaths: ['node_modules/**'],
    minSeverity: 'minor',
    generateMissingDocs: true,
    llmProvider: 'openai',
    llmModel: 'gpt-4',
    temperature: 0.3,
    documentationFormat: 'markdown',
    mode: 'manual',
  });

  const createMockAPIDiff = (): APIDiff => ({
    added: [
      {
        type: 'function',
        name: 'newFunction',
        signature: 'function newFunction(param: string): void',
        location: { startLine: 1, endLine: 3, startColumn: 0, endColumn: 1 },
        isPublic: true,
      },
    ],
    removed: [],
    modified: [],
    unchanged: [],
  });

  const createMockDocFile = (content: string): DocFile => ({
    path: 'docs/api.md',
    content,
    references: [],
    examples: [],
  });

  describe('buildContext', () => {
    it('should build complete documentation context', () => {
      const diff = createMockAPIDiff();
      const docFile = createMockDocFile('# API Documentation\n\nUse this function.');
      const affectedDocs: AffectedDocumentation = {
        files: new Map([['docs/api.md', docFile]]),
        totalReferences: 1,
        missingDocs: [],
      };
      const config = createMockConfig();

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context).toBeDefined();
      expect(context.codeChanges).toBe(diff);
      expect(context.affectedFiles).toHaveLength(1);
      expect(context.affectedFiles[0]).toBe(docFile);
      expect(context.styleGuide).toBeDefined();
      expect(context.projectContext).toBeDefined();
      expect(context.examples).toBeDefined();
    });

    it('should include project context with correct language', () => {
      const diff = createMockAPIDiff();
      const affectedDocs: AffectedDocumentation = {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };
      const config = createMockConfig();

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.projectContext.language).toBe('TypeScript');
      expect(context.projectContext.documentationFormat).toBe('markdown');
    });

    it('should collect code examples from affected files', () => {
      const diff = createMockAPIDiff();
      const example: CodeExample = {
        filePath: 'docs/api.md',
        code: 'const result = myFunction();',
        language: 'typescript',
        startLine: 10,
        endLine: 12,
      };
      const docFile: DocFile = {
        path: 'docs/api.md',
        content: '# API',
        references: [],
        examples: [example],
      };
      const affectedDocs: AffectedDocumentation = {
        files: new Map([['docs/api.md', docFile]]),
        totalReferences: 0,
        missingDocs: [],
      };
      const config = createMockConfig();

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.examples).toHaveLength(1);
      expect(context.examples[0]).toBe(example);
    });
  });

  describe('extractStyleGuide', () => {
    it('should return default style guide for empty doc files', () => {
      const styleGuide = builder.extractStyleGuide([]);

      expect(styleGuide.tone).toContain('Direct and instructional');
      expect(styleGuide.formatting).toContain('markdown');
      expect(styleGuide.conventions).toContain('Standard technical documentation');
    });

    it('should detect direct/instructional tone', () => {
      const docFile = createMockDocFile(
        'You can use this function to process data.\nCreate a new instance first.'
      );

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.tone).toContain('Direct and instructional');
    });

    it('should detect collaborative tone', () => {
      const docFile = createMockDocFile(
        'We recommend using this approach.\nOur implementation follows best practices.'
      );

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.tone).toContain('Collaborative and inclusive');
    });

    it('should detect formal tone', () => {
      const docFile = createMockDocFile(
        'The function processes input data.\nThe system returns a result object.'
      );

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.tone).toContain('Formal and objective');
    });

    it('should identify markdown formatting patterns', () => {
      const docFile = createMockDocFile(`
# Header
## Subheader

- Bullet point
- Another point

1. Numbered item
2. Second item

Use \`inline code\` and **bold text**.

\`\`\`typescript
const example = true;
\`\`\`
      `);

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.formatting).toContain('markdown headers');
      expect(styleGuide.formatting).toContain('fenced code blocks');
      expect(styleGuide.formatting).toContain('bullet lists');
      expect(styleGuide.formatting).toContain('numbered lists');
      expect(styleGuide.formatting).toContain('bold');
      expect(styleGuide.formatting).toContain('inline code');
    });

    it('should extract JSDoc conventions', () => {
      const docFile = createMockDocFile(`
/**
 * @param name - The user name
 * @returns The greeting message
 * @example
 * greet('John')
 */
      `);

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.conventions).toContain('Uses JSDoc-style annotations');
    });

    it('should detect parameter documentation patterns', () => {
      const docFile = createMockDocFile(`
## Parameters:
- name: string - The user name
- age: number - The user age
      `);

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.conventions).toContain('Documents parameters in dedicated sections');
    });

    it('should detect return value documentation', () => {
      const docFile = createMockDocFile(`
## Returns:
A promise that resolves to the result
      `);

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.conventions).toContain('Documents return values explicitly');
    });

    it('should identify example patterns with comments', () => {
      const example: CodeExample = {
        filePath: 'docs/api.md',
        code: '// Initialize the service\nconst service = new Service();',
        language: 'typescript',
        startLine: 1,
        endLine: 2,
      };
      const docFile: DocFile = {
        path: 'docs/api.md',
        content: '# API',
        references: [],
        examples: [example],
      };

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.examplePatterns).toContain('Examples include explanatory comments');
    });

    it('should identify example patterns with imports', () => {
      const example: CodeExample = {
        filePath: 'docs/api.md',
        code: "import { Service } from './service';\nconst service = new Service();",
        language: 'typescript',
        startLine: 1,
        endLine: 2,
      };
      const docFile: DocFile = {
        path: 'docs/api.md',
        content: '# API',
        references: [],
        examples: [example],
      };

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.examplePatterns).toContain('Examples show import statements');
    });

    it('should distinguish between full implementations and snippets', () => {
      const fullExample: CodeExample = {
        filePath: 'docs/api.md',
        code: 'function process(data) {\n  return data.map(x => x * 2);\n}',
        language: 'javascript',
        startLine: 1,
        endLine: 3,
      };
      const docFile: DocFile = {
        path: 'docs/api.md',
        content: '# API',
        references: [],
        examples: [fullExample],
      };

      const styleGuide = builder.extractStyleGuide([docFile]);

      expect(styleGuide.examplePatterns).toContain(
        'Examples demonstrate complete function implementations'
      );
    });
  });

  describe('language inference', () => {
    it('should infer TypeScript from .ts extension', () => {
      const config = createMockConfig();
      config.codePaths = ['src/**/*.ts'];

      const diff = createMockAPIDiff();
      const affectedDocs: AffectedDocumentation = {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.projectContext.language).toBe('TypeScript');
    });

    it('should infer JavaScript from .js extension', () => {
      const config = createMockConfig();
      config.codePaths = ['src/**/*.js'];

      const diff = createMockAPIDiff();
      const affectedDocs: AffectedDocumentation = {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.projectContext.language).toBe('JavaScript');
    });

    it('should infer Python from .py extension', () => {
      const config = createMockConfig();
      config.codePaths = ['src/**/*.py'];

      const diff = createMockAPIDiff();
      const affectedDocs: AffectedDocumentation = {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.projectContext.language).toBe('Python');
    });
  });

  describe('custom style guide', () => {
    it('should include custom guidelines in project context', () => {
      const config = createMockConfig();
      config.customStyleGuide = 'Always use active voice and present tense';

      const diff = createMockAPIDiff();
      const affectedDocs: AffectedDocumentation = {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };

      const context = builder.buildContext(diff, affectedDocs, config);

      expect(context.projectContext.customGuidelines).toBe(
        'Always use active voice and present tense'
      );
    });
  });
});
