import * as fs from 'fs';
import * as path from 'path';
import {
  APIElement,
  APIDiff,
  DocReference,
  CodeExample,
  DocFile,
  AffectedDocumentation,
  AgentConfig,
} from '../types';

/**
 * DocumentationMapper finds all documentation files that reference changed code
 */
export class DocumentationMapper {
  private readonly docIndex: Map<string, string> = new Map();
  private readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Initialize the mapper by scanning and indexing documentation files
   */
  async initialize(): Promise<void> {
    this.docIndex.clear();

    for (const docPath of this.config.documentationPaths) {
      await this.scanDirectory(docPath);
    }
  }

  /**
   * Recursively scan a directory for markdown files
   */
  private async scanDirectory(pattern: string): Promise<void> {
    // Handle glob patterns by extracting the base directory
    const basePath = this.extractBasePath(pattern);

    if (!fs.existsSync(basePath)) {
      return;
    }

    const stats = fs.statSync(basePath);

    if (stats.isFile() && this.isMarkdownFile(basePath)) {
      const content = fs.readFileSync(basePath, 'utf-8');
      this.docIndex.set(basePath, content);
      return;
    }

    if (stats.isDirectory()) {
      const entries = fs.readdirSync(basePath);

      for (const entry of entries) {
        const fullPath = path.join(basePath, entry);
        const entryStats = fs.statSync(fullPath);

        if (entryStats.isDirectory()) {
          await this.scanDirectory(fullPath);
        } else if (this.isMarkdownFile(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          this.docIndex.set(fullPath, content);
        }
      }
    }
  }

  /**
   * Extract base path from glob pattern
   */
  private extractBasePath(pattern: string): string {
    // Remove glob patterns like **, *, etc.
    const parts = pattern.split('/');
    const baseParts: string[] = [];

    for (const part of parts) {
      if (part.includes('*') || part.includes('?')) {
        break;
      }
      baseParts.push(part);
    }

    return baseParts.join('/') || '.';
  }

  /**
   * Check if a file is a markdown file
   */
  private isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.md' || ext === '.mdx';
  }

  /**
   * Get all indexed documentation files
   */
  getIndexedFiles(): string[] {
    return Array.from(this.docIndex.keys());
  }

  /**
   * Get content of a specific documentation file
   */
  getFileContent(filePath: string): string | undefined {
    return this.docIndex.get(filePath);
  }

  /**
   * Find documentation files that reference an API element
   */
  async findReferences(apiElement: APIElement): Promise<DocReference[]> {
    const references: DocReference[] = [];
    const apiName = apiElement.name;

    for (const [filePath, content] of this.docIndex.entries()) {
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // Search for exact name matches using word boundaries
        const regex = new RegExp(`\\b${this.escapeRegex(apiName)}\\b`, 'g');

        if (regex.test(line)) {
          // Extract context (current line plus surrounding lines)
          const contextStart = Math.max(0, i - 1);
          const contextEnd = Math.min(lines.length - 1, i + 1);
          const context = lines.slice(contextStart, contextEnd + 1).join('\n');

          references.push({
            filePath,
            lineNumber,
            context,
            referenceType: 'name',
          });
        }
      }
    }

    return references;
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Find code examples that use an API element
   */
  async findCodeExamples(apiElement: APIElement): Promise<CodeExample[]> {
    const examples: CodeExample[] = [];
    const apiName = apiElement.name;

    for (const [filePath, content] of this.docIndex.entries()) {
      const codeBlocks = this.extractCodeBlocks(content, filePath);

      for (const block of codeBlocks) {
        // Check if the code block contains the API name
        const regex = new RegExp(`\\b${this.escapeRegex(apiName)}\\b`);
        if (regex.exec(block.code)) {
          examples.push(block);
        }
      }
    }

    return examples;
  }

  /**
   * Extract code blocks from markdown content
   */
  private extractCodeBlocks(content: string, filePath: string): CodeExample[] {
    const blocks: CodeExample[] = [];
    const lines = content.split('\n');
    let inCodeBlock = false;
    let currentBlock: string[] = [];
    let currentLanguage = '';
    let blockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for code fence start
      const fenceMatch = /^```(\w+)?/.exec(line);
      if (fenceMatch && !inCodeBlock) {
        inCodeBlock = true;
        currentLanguage = fenceMatch[1] || '';
        blockStartLine = i + 1;
        currentBlock = [];
        continue;
      }

      // Check for code fence end
      if (/^```$/.exec(line) && inCodeBlock) {
        inCodeBlock = false;
        blocks.push({
          filePath,
          code: currentBlock.join('\n'),
          language: currentLanguage,
          startLine: blockStartLine + 1,
          endLine: i,
        });
        currentBlock = [];
        continue;
      }

      // Collect code block content
      if (inCodeBlock) {
        currentBlock.push(line);
      }
    }

    return blocks;
  }

  /**
   * Build a complete map of affected documentation
   */
  async mapAffectedDocs(diff: APIDiff): Promise<AffectedDocumentation> {
    const filesMap = new Map<string, DocFile>();
    const missingDocs: APIElement[] = [];
    let totalReferences = 0;

    // Collect all changed APIs (added, removed, modified)
    const changedAPIs: APIElement[] = [
      ...diff.added,
      ...diff.removed,
      ...diff.modified.map((m) => m.new),
    ];

    for (const api of changedAPIs) {
      // Find references and examples for this API
      const references = await this.findReferences(api);
      const examples = await this.findCodeExamples(api);

      // If no references found for a public API, mark as missing docs
      if (references.length === 0 && examples.length === 0 && api.isPublic) {
        missingDocs.push(api);
        continue;
      }

      totalReferences += references.length;

      // Group references by file
      for (const ref of references) {
        if (!filesMap.has(ref.filePath)) {
          filesMap.set(ref.filePath, {
            path: ref.filePath,
            content: this.docIndex.get(ref.filePath) || '',
            references: [],
            examples: [],
          });
        }

        const docFile = filesMap.get(ref.filePath)!;
        docFile.references.push(ref);
      }

      // Group examples by file
      for (const example of examples) {
        if (!filesMap.has(example.filePath)) {
          filesMap.set(example.filePath, {
            path: example.filePath,
            content: this.docIndex.get(example.filePath) || '',
            references: [],
            examples: [],
          });
        }

        const docFile = filesMap.get(example.filePath)!;
        docFile.examples.push(example);
      }
    }

    return {
      files: filesMap,
      totalReferences,
      missingDocs,
    };
  }
}
