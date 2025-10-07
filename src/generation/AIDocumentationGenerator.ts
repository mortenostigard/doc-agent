import Anthropic from '@anthropic-ai/sdk';
import {
  DocumentationContext,
  DocumentationUpdate,
  ValidationResult,
  APIElement,
  DocFile,
} from '../types';

/**
 * AIDocumentationGenerator uses Claude/Anthropic to generate intelligent
 * documentation updates that maintain style and accuracy
 *
 * Note on implementation simplicity:
 * This implementation prioritizes code clarity and test simplicity for learning purposes.
 * Production considerations that are intentionally simplified:
 * - Retries happen immediately without exponential backoff delays
 * - No structured logging (console.log/error removed for clean test output)
 *
 * For a production system, you'd want:
 * - Exponential backoff between retries (e.g., 1s, 2s, 4s)
 * - Injectable logger interface for proper observability
 * - Rate limit handling and request queuing
 */
export class AIDocumentationGenerator {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxRetries: number;

  constructor(
    apiKey: string,
    model: string = 'claude-sonnet-4-5-20250929',
    temperature: number = 0.3,
    maxRetries: number = 3
  ) {
    if (!apiKey) {
      throw new Error('Anthropic API key is required. Set ANTHROPIC_API_KEY environment variable.');
    }

    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxRetries = maxRetries;
  }

  /**
   * Generate updated documentation for a specific file
   *
   * Implements simple retry logic without delays for test simplicity.
   * In production, you'd add exponential backoff between retries.
   */
  async generateUpdate(
    docFile: DocFile,
    context: DocumentationContext
  ): Promise<DocumentationUpdate> {
    const prompt = this.buildUpdatePrompt(docFile, context);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.callLLM(prompt);
        const update = this.parseUpdateResponse(response, docFile);

        // Validate the generated update
        const validation = this.validate(update);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        return update;
      } catch (error) {
        lastError = error as Error;

        if (attempt >= this.maxRetries) {
          break;
        }
        // Note: No delay between retries for simplicity
        // Production would add: await delay(1000 * Math.pow(2, attempt))
      }
    }

    throw new Error(
      `Failed to generate update after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate documentation for missing APIs
   */
  async generateNewDoc(apiElement: APIElement, context: DocumentationContext): Promise<string> {
    const prompt = this.buildNewDocPrompt(apiElement, context);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.callLLM(prompt);
        return this.parseNewDocResponse(response);
      } catch (error) {
        lastError = error as Error;

        if (attempt >= this.maxRetries) {
          break;
        }
      }
    }

    throw new Error(
      `Failed to generate new documentation after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Validate generated documentation
   */
  validate(update: DocumentationUpdate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check that updated content is not empty
    if (!update.updatedContent || update.updatedContent.trim().length === 0) {
      errors.push('Updated content is empty');
    }

    // Check that content actually changed
    if (update.updatedContent === update.originalContent) {
      warnings.push('Updated content is identical to original');
    }

    // Check markdown structure is preserved
    this.validateMarkdownStructure(update, warnings);

    // Check code blocks are properly formatted
    this.validateCodeBlockFormat(update, warnings, errors);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate markdown structure is preserved
   */
  private validateMarkdownStructure(update: DocumentationUpdate, warnings: string[]): void {
    const originalHeaders = this.extractHeaders(update.originalContent);
    const updatedHeaders = this.extractHeaders(update.updatedContent);

    // Warn if all headers were removed (likely a mistake)
    if (originalHeaders.length > 0 && updatedHeaders.length === 0) {
      warnings.push('All markdown headers were removed');
    }

    // Check if major structural elements are preserved
    const originalHasLists = /^\s*[-*+]\s+/m.test(update.originalContent);
    const updatedHasLists = /^\s*[-*+]\s+/m.test(update.updatedContent);

    if (originalHasLists && !updatedHasLists) {
      warnings.push('List formatting may have been removed');
    }

    // Check if code blocks exist in original but were removed
    const originalBlocks = this.extractCodeBlocks(update.originalContent);
    const updatedBlocks = this.extractCodeBlocks(update.updatedContent);

    if (originalBlocks.length > 0 && updatedBlocks.length === 0) {
      warnings.push('All code examples were removed');
    }
  }

  /**
   * Validate code blocks have proper markdown format
   */
  private validateCodeBlockFormat(
    update: DocumentationUpdate,
    warnings: string[],
    errors: string[]
  ): void {
    const codeBlocks = this.extractCodeBlocks(update.updatedContent);

    if (codeBlocks.length === 0) {
      return;
    }

    // Check each code block has proper opening and closing backticks
    for (const block of codeBlocks) {
      if (!this.isValidCodeBlock(block)) {
        errors.push(`Code block has malformed markdown: ${block.substring(0, 50)}...`);
      }
    }

    // Warn if significantly fewer code blocks (might indicate accidental removal)
    const originalBlocks = this.extractCodeBlocks(update.originalContent);
    if (originalBlocks.length > codeBlocks.length + 1) {
      warnings.push(
        `Number of code blocks decreased from ${originalBlocks.length} to ${codeBlocks.length}`
      );
    }
  }

  /**
   * Call the LLM API with retry logic
   */
  private async callLLM(prompt: { system: string; user: string }): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: this.temperature,
        system: prompt.system,
        messages: [
          {
            role: 'user',
            content: prompt.user,
          },
        ],
      });

      // Extract text from response
      const textContent = message.content.find((block) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content in LLM response');
      }

      return textContent.text;
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(`Anthropic API error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Build prompt for updating existing documentation
   */
  private buildUpdatePrompt(
    docFile: DocFile,
    context: DocumentationContext
  ): { system: string; user: string } {
    const system = this.buildSystemPrompt(context);
    const user = this.buildUserPromptForUpdate(docFile, context);

    return { system, user };
  }

  /**
   * Build system prompt explaining the task
   */
  private buildSystemPrompt(context: DocumentationContext): string {
    return `You are an expert technical documentation writer tasked with updating documentation to reflect code changes.

Your responsibilities:
1. Update documentation to accurately reflect API changes
2. Preserve the original tone, style, and structure of the documentation
3. Update code examples to use the new API signatures
4. Maintain consistency with the project's documentation conventions
5. Ensure all changes are accurate and technically correct

Style Guidelines:
- Tone: ${context.styleGuide.tone}
- Formatting: ${context.styleGuide.formatting}
- Conventions: ${context.styleGuide.conventions.join(', ')}

Project Context:
- Language: ${context.projectContext.language}
${context.projectContext.framework ? `- Framework: ${context.projectContext.framework}` : ''}
- Documentation Format: ${context.projectContext.documentationFormat}
${context.projectContext.customGuidelines ? `- Custom Guidelines: ${context.projectContext.customGuidelines}` : ''}

Important Rules:
- Only update content that is affected by the code changes
- Preserve all markdown formatting and structure
- Keep code examples working and executable
- If a change is breaking, add appropriate warnings or migration notes
- Maintain the same level of detail as the original documentation
- Do not add unnecessary information or change the scope of the documentation`;
  }

  /**
   * Build user prompt for documentation update
   */
  private buildUserPromptForUpdate(docFile: DocFile, context: DocumentationContext): string {
    const codeChangesSection = this.formatCodeChanges(context.codeChanges);
    const referencesSection = this.formatReferences(docFile);
    const examplesSection = this.formatExamples(docFile);

    return `Please update the following documentation file to reflect the code changes described below.

## Code Changes

${codeChangesSection}

## Current Documentation

File: ${docFile.path}

\`\`\`markdown
${docFile.content}
\`\`\`

${referencesSection}

${examplesSection}

## Required Output Format

Please provide your response in the following JSON format:

\`\`\`json
{
  "updatedContent": "The complete updated documentation content in markdown format",
  "reasoning": "Brief explanation of what was changed and why",
  "changes": [
    {
      "type": "example|description|signature|addition",
      "description": "What was changed in this section"
    }
  ]
}
\`\`\`

Ensure the updatedContent is the complete, updated documentation that can directly replace the original file.`;
  }

  /**
   * Build prompt for generating new documentation
   */
  private buildNewDocPrompt(
    apiElement: APIElement,
    context: DocumentationContext
  ): { system: string; user: string } {
    const system = this.buildSystemPrompt(context);
    const user = this.buildUserPromptForNewDoc(apiElement, context);

    return { system, user };
  }

  /**
   * Build user prompt for new documentation
   */
  private buildUserPromptForNewDoc(apiElement: APIElement, context: DocumentationContext): string {
    return `Please create documentation for the following new API element.

## API Element

Type: ${apiElement.type}
Name: ${apiElement.name}
Signature: ${apiElement.signature}
${apiElement.documentation ? `Existing Comments: ${apiElement.documentation}` : ''}
${apiElement.parameters ? `Parameters: ${JSON.stringify(apiElement.parameters, null, 2)}` : ''}
${apiElement.returnType ? `Return Type: ${apiElement.returnType}` : ''}

## Style Guidelines

Follow these conventions from existing documentation:
${context.styleGuide.conventions.map((c) => `- ${c}`).join('\n')}

${context.styleGuide.examplePatterns.length > 0
        ? `
Example Patterns:
${context.styleGuide.examplePatterns.map((p) => `- ${p}`).join('\n')}
`
        : ''
      }

## Required Output

Please provide complete documentation for this API element in ${context.projectContext.documentationFormat} format.
Include:
1. A clear description of what it does
2. Parameter descriptions (if applicable)
3. Return value description (if applicable)
4. A usage example
5. Any important notes or warnings

The documentation should match the tone and style of the existing documentation.`;
  }

  /**
   * Format code changes for prompt
   */
  private formatCodeChanges(changes: any): string {
    const sections: string[] = [];

    if (changes.added && changes.added.length > 0) {
      sections.push('### Added APIs\n');
      changes.added.forEach((api: APIElement) => {
        sections.push(`- **${api.name}** (${api.type}): ${api.signature}`);
      });
    }

    if (changes.removed && changes.removed.length > 0) {
      sections.push('\n### Removed APIs\n');
      changes.removed.forEach((api: APIElement) => {
        sections.push(`- **${api.name}** (${api.type}): ${api.signature}`);
      });
    }

    if (changes.modified && changes.modified.length > 0) {
      sections.push('\n### Modified APIs\n');
      changes.modified.forEach((mod: any) => {
        sections.push(`- **${mod.new.name}** (${mod.new.type})`);
        sections.push(`  - Old: ${mod.old.signature}`);
        sections.push(`  - New: ${mod.new.signature}`);
        if (mod.changes && mod.changes.length > 0) {
          sections.push(`  - Changes: ${mod.changes.map((c: any) => c.description).join(', ')}`);
        }
      });
    }

    return sections.length > 0 ? sections.join('\n') : 'No API changes detected.';
  }

  /**
   * Format documentation references for prompt
   */
  private formatReferences(docFile: DocFile): string {
    if (!docFile.references || docFile.references.length === 0) {
      return '';
    }

    const sections: string[] = ['## References Found\n'];
    sections.push(
      `This documentation file contains ${docFile.references.length} reference(s) to the changed APIs:\n`
    );

    docFile.references.forEach((ref, index) => {
      sections.push(
        `${index + 1}. Line ${ref.lineNumber} (${ref.referenceType}): "${ref.context}"`
      );
    });

    return sections.join('\n');
  }

  /**
   * Format code examples for prompt
   */
  private formatExamples(docFile: DocFile): string {
    if (!docFile.examples || docFile.examples.length === 0) {
      return '';
    }

    const sections: string[] = ['## Code Examples Found\n'];
    sections.push(`This documentation contains ${docFile.examples.length} code example(s):\n`);

    docFile.examples.forEach((example, index) => {
      sections.push(`### Example ${index + 1} (Lines ${example.startLine}-${example.endLine})`);
      sections.push(`\`\`\`${example.language}`);
      sections.push(example.code);
      sections.push('```\n');
    });

    return sections.join('\n');
  }

  /**
   * Parse LLM response for documentation update
   */
  private parseUpdateResponse(response: string, docFile: DocFile): DocumentationUpdate {
    try {
      // Try to extract JSON from the response
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const jsonMatch = jsonRegex.exec(response);
      let parsedResponse;

      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        // Try to parse the entire response as JSON
        parsedResponse = JSON.parse(response);
      }

      // Validate required fields
      if (!parsedResponse.updatedContent) {
        throw new Error('Response missing updatedContent field');
      }

      // Build ContentChange objects from the response
      const contentChanges = this.buildContentChanges(
        docFile.content,
        parsedResponse.updatedContent,
        parsedResponse.changes || []
      );

      return {
        filePath: docFile.path,
        originalContent: docFile.content,
        updatedContent: parsedResponse.updatedContent,
        changes: contentChanges,
        reasoning: parsedResponse.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      // Fallback: treat the entire response as updated content
      // Try to extract markdown content from code blocks
      const markdownRegex = /```markdown\s*([\s\S]*?)\s*```/;
      const markdownMatch = markdownRegex.exec(response);
      const updatedContent = markdownMatch ? markdownMatch[1] : response;

      return {
        filePath: docFile.path,
        originalContent: docFile.content,
        updatedContent: updatedContent.trim(),
        changes: [],
        reasoning: 'Parsed from unstructured response',
      };
    }
  }

  /**
   * Parse LLM response for new documentation
   */
  private parseNewDocResponse(response: string): string {
    // Try to extract markdown content from code blocks
    const markdownRegex = /```markdown\s*([\s\S]*?)\s*```/;
    const markdownMatch = markdownRegex.exec(response);
    if (markdownMatch) {
      return markdownMatch[1].trim();
    }

    // Try to extract from generic code blocks
    const codeBlockRegex = /```\s*([\s\S]*?)\s*```/;
    const codeBlockMatch = codeBlockRegex.exec(response);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Return the raw response if no code blocks found
    return response.trim();
  }

  /**
   * Build ContentChange objects by comparing old and new content
   */
  private buildContentChanges(
    originalContent: string,
    updatedContent: string,
    _changeDescriptions: any[]
  ): any[] {
    const changes: any[] = [];
    const originalLines = originalContent.split('\n');
    const updatedLines = updatedContent.split('\n');

    let i = 0;
    let j = 0;

    while (i < originalLines.length || j < updatedLines.length) {
      // Find matching lines
      if (this.linesMatch(originalLines, updatedLines, i, j)) {
        i++;
        j++;
        continue;
      }

      // Found a difference - collect the changed section
      const change = this.collectChangedSection(originalLines, updatedLines, i, j);
      if (change) {
        changes.push(change.contentChange);
        i = change.newI;
        j = change.newJ;
      }
    }

    return changes;
  }

  /**
   * Check if lines at given indices match
   */
  private linesMatch(
    originalLines: string[],
    updatedLines: string[],
    i: number,
    j: number
  ): boolean {
    return (
      i < originalLines.length && j < updatedLines.length && originalLines[i] === updatedLines[j]
    );
  }

  /**
   * Collect a section of changed content
   */
  private collectChangedSection(
    originalLines: string[],
    updatedLines: string[],
    startI: number,
    startJ: number
  ): { contentChange: any; newI: number; newJ: number } | null {
    const startLine = startI;
    const oldSection: string[] = [];
    const newSection: string[] = [];

    let i = startI;
    let j = startJ;

    // Collect old lines until we find a match
    while (i < originalLines.length && !this.findNearbyMatch(originalLines[i], updatedLines, j)) {
      oldSection.push(originalLines[i]);
      i++;
    }

    // Collect new lines until we find a match
    while (j < updatedLines.length && !this.findNearbyMatch(updatedLines[j], originalLines, i)) {
      newSection.push(updatedLines[j]);
      j++;
    }

    if (oldSection.length === 0 && newSection.length === 0) {
      return null;
    }

    const changeType = this.determineChangeType(oldSection, newSection);

    return {
      contentChange: {
        type: changeType,
        startLine: startLine + 1,
        endLine: startLine + Math.max(oldSection.length, newSection.length),
        oldContent: oldSection.join('\n'),
        newContent: newSection.join('\n'),
      },
      newI: i,
      newJ: j,
    };
  }

  /**
   * Find if a line has a match nearby in the target array
   */
  private findNearbyMatch(line: string, targetLines: string[], startIndex: number): boolean {
    const searchWindow = 10;
    const endIndex = Math.min(startIndex + searchWindow, targetLines.length);

    for (let k = startIndex; k < endIndex; k++) {
      if (targetLines[k] === line) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine the type of change based on content
   */
  private determineChangeType(oldSection: string[], newSection: string[]): any {
    const combinedContent = [...oldSection, ...newSection].join('\n').toLowerCase();

    if (combinedContent.includes('```')) {
      return 'example';
    }

    if (combinedContent.includes('(') && combinedContent.includes(')')) {
      return 'signature';
    }

    if (oldSection.length === 0) {
      return 'addition';
    }

    return 'description';
  }

  /**
   * Extract markdown headers from content
   */
  private extractHeaders(content: string): string[] {
    const headerRegex = /^#{1,6}\s+.+$/gm;
    return content.match(headerRegex) || [];
  }

  /**
   * Extract code blocks from markdown
   */
  private extractCodeBlocks(content: string): string[] {
    const codeBlockRegex = /```[\s\S]*?```/g;
    return content.match(codeBlockRegex) || [];
  }

  /**
   * Basic validation for code block structure
   */
  private isValidCodeBlock(block: string): boolean {
    // Check that code block has opening and closing backticks
    const lines = block.split('\n');
    if (lines.length < 2) return false;

    const firstLine = lines[0].trim();
    const lastLine = lines[lines.length - 1].trim();

    return firstLine.startsWith('```') && lastLine === '```';
  }
}
