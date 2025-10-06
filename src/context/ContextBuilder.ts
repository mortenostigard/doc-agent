import {
  APIDiff,
  AffectedDocumentation,
  AgentConfig,
  DocumentationContext,
  ProjectContext,
  StyleGuide,
  DocFile,
  CodeExample,
} from '../types';

/**
 * ContextBuilder aggregates all information needed for LLM-based documentation generation.
 * It combines code changes, affected documentation, style guidelines, and project context
 * into a structured format suitable for AI processing.
 */
export class ContextBuilder {
  /**
   * Build comprehensive context for documentation update generation
   * @param diff - The API differences detected in the code
   * @param affectedDocs - Documentation files affected by the changes
   * @param config - Agent configuration containing project settings
   * @returns Complete documentation context for LLM processing
   */
  buildContext(
    diff: APIDiff,
    affectedDocs: AffectedDocumentation,
    config: AgentConfig
  ): DocumentationContext {
    // Extract all affected doc files from the map
    const affectedFiles = Array.from(affectedDocs.files.values());

    // Extract style guide from existing documentation
    const styleGuide = this.extractStyleGuide(affectedFiles);

    // Build project context from configuration
    const projectContext = this.buildProjectContext(config);

    // Collect all code examples from affected documentation
    const examples = this.collectCodeExamples(affectedFiles);

    return {
      codeChanges: diff,
      affectedFiles,
      styleGuide,
      projectContext,
      examples,
    };
  }

  /**
   * Extract style guidelines from existing documentation files
   * Analyzes tone, formatting patterns, and conventions used in the docs
   * @param docFiles - Array of documentation files to analyze
   * @returns StyleGuide object with extracted patterns
   */
  extractStyleGuide(docFiles: DocFile[]): StyleGuide {
    if (docFiles.length === 0) {
      return this.getDefaultStyleGuide();
    }

    const tone = this.analyzeTone(docFiles);
    const formatting = this.analyzeFormatting(docFiles);
    const conventions = this.extractConventions(docFiles);
    const examplePatterns = this.extractExamplePatterns(docFiles);

    return {
      tone,
      formatting,
      conventions,
      examplePatterns,
    };
  }

  /**
   * Build project context from agent configuration
   * @param config - Agent configuration
   * @returns ProjectContext with language and format information
   */
  private buildProjectContext(config: AgentConfig): ProjectContext {
    // Infer primary language from code paths
    const language = this.inferLanguage(config.codePaths);

    return {
      language,
      documentationFormat: config.documentationFormat,
      customGuidelines: config.customStyleGuide,
    };
  }

  /**
   * Collect all code examples from documentation files
   * @param docFiles - Array of documentation files
   * @returns Array of all code examples found
   */
  private collectCodeExamples(docFiles: DocFile[]): CodeExample[] {
    const examples: CodeExample[] = [];

    for (const docFile of docFiles) {
      examples.push(...docFile.examples);
    }

    return examples;
  }

  /**
   * Analyze the tone used in documentation
   * @param docFiles - Documentation files to analyze
   * @returns Description of the documentation tone
   */
  private analyzeTone(docFiles: DocFile[]): string {
    // Analyze first-person vs third-person usage
    const combinedContent = docFiles.map((f) => f.content).join('\n');

    const hasFirstPerson = /\b(we|our|us)\b/i.test(combinedContent);
    const hasSecondPerson = /\b(you|your)\b/i.test(combinedContent);
    const hasImperative = /^(create|use|implement|add|remove|update|configure)/im.test(
      combinedContent
    );

    if (hasSecondPerson || hasImperative) {
      return 'Direct and instructional, addressing the reader directly';
    } else if (hasFirstPerson) {
      return 'Collaborative and inclusive, using first-person plural';
    } else {
      return 'Formal and objective, using third-person perspective';
    }
  }

  /**
   * Analyze formatting patterns in documentation
   * @param docFiles - Documentation files to analyze
   * @returns Description of formatting style
   */
  private analyzeFormatting(docFiles: DocFile[]): string {
    const combinedContent = docFiles.map((f) => f.content).join('\n');

    const patterns: string[] = [];

    // Check for common formatting patterns
    if (/^#{1,6}\s+/m.test(combinedContent)) {
      patterns.push('Uses markdown headers for structure');
    }

    if (/```\w*\n[\s\S]*?\n```/m.test(combinedContent)) {
      patterns.push('Uses fenced code blocks for examples');
    }

    if (/^\s*[-*+]\s+/m.test(combinedContent)) {
      patterns.push('Uses bullet lists for enumeration');
    }

    if (/^\s*\d+\.\s+/m.test(combinedContent)) {
      patterns.push('Uses numbered lists for sequences');
    }

    if (/\*\*[^*]+\*\*/m.test(combinedContent)) {
      patterns.push('Uses bold for emphasis');
    }

    if (/`[^`]+`/m.test(combinedContent)) {
      patterns.push('Uses inline code formatting');
    }

    return patterns.length > 0 ? patterns.join('; ') : 'Standard markdown formatting';
  }

  /**
   * Extract documentation conventions
   * @param docFiles - Documentation files to analyze
   * @returns Array of identified conventions
   */
  private extractConventions(docFiles: DocFile[]): string[] {
    const conventions: string[] = [];
    const combinedContent = docFiles.map((f) => f.content).join('\n');

    // Check for JSDoc-style documentation
    if (/@param|@returns|@example/i.test(combinedContent)) {
      conventions.push('Uses JSDoc-style annotations');
    }

    // Check for parameter documentation patterns
    if (/Parameters?:/i.test(combinedContent)) {
      conventions.push('Documents parameters in dedicated sections');
    }

    // Check for return value documentation
    if (/Returns?:/i.test(combinedContent)) {
      conventions.push('Documents return values explicitly');
    }

    // Check for example sections
    if (/Examples?:/i.test(combinedContent)) {
      conventions.push('Includes example sections');
    }

    // Check for type information
    if (/\{[A-Z][a-zA-Z]*\}|: [A-Z][a-zA-Z]*/m.test(combinedContent)) {
      conventions.push('Includes type information');
    }

    return conventions.length > 0 ? conventions : ['Standard technical documentation'];
  }

  /**
   * Extract patterns used in code examples
   * @param docFiles - Documentation files to analyze
   * @returns Array of example patterns
   */
  private extractExamplePatterns(docFiles: DocFile[]): string[] {
    const patterns: string[] = [];
    const examples = docFiles.flatMap((f) => f.examples);

    if (examples.length === 0) {
      return ['No code examples found'];
    }

    // Analyze example characteristics
    const hasComments = examples.some((ex) => /\/\/|\/\*|#/.test(ex.code));
    const hasImports = examples.some((ex) => /^import |^from |^require\(/m.test(ex.code));
    const hasFullFunctions = examples.some((ex) =>
      /function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+\(/m.test(ex.code)
    );

    if (hasComments) {
      patterns.push('Examples include explanatory comments');
    }

    if (hasImports) {
      patterns.push('Examples show import statements');
    }

    if (hasFullFunctions) {
      patterns.push('Examples demonstrate complete function implementations');
    } else {
      patterns.push('Examples show usage snippets');
    }

    return patterns;
  }

  /**
   * Infer primary programming language from code paths
   * @param codePaths - Array of code path patterns
   * @returns Inferred language name
   */
  private inferLanguage(codePaths: string[]): string {
    const pathString = codePaths.join(' ');

    if (/\.tsx?/.test(pathString)) {
      return 'TypeScript';
    } else if (/\.jsx?/.test(pathString)) {
      return 'JavaScript';
    } else if (/\.py/.test(pathString)) {
      return 'Python';
    } else if (/\.java/.test(pathString)) {
      return 'Java';
    } else if (/\.go/.test(pathString)) {
      return 'Go';
    } else if (/\.rs/.test(pathString)) {
      return 'Rust';
    }

    return 'Unknown';
  }

  /**
   * Get default style guide when no documentation exists
   * @returns Default StyleGuide object
   */
  private getDefaultStyleGuide(): StyleGuide {
    return {
      tone: 'Direct and instructional, addressing the reader directly',
      formatting: 'Standard markdown formatting with code blocks',
      conventions: ['Standard technical documentation'],
      examplePatterns: ['Usage snippets with inline comments'],
    };
  }
}
