import * as fs from 'fs';
import * as path from 'path';
import { ChangeDetector } from '../detection/ChangeDetector';
import { CodeParser } from '../parsing/CodeParser';
import { DiffAnalyzer } from '../diff/DiffAnalyzer';
import { DocumentationMapper } from '../mapping/DocumentationMapper';
import { ContextBuilder } from '../context/ContextBuilder';
import { AIDocumentationGenerator } from '../generation/AIDocumentationGenerator';
import { ReviewInterface } from '../review/ReviewInterface';
import {
  AgentConfig,
  AgentInput,
  AgentResult,
  AgentState,
  PipelineState,
  CodeChange,
  ParsedCode,
  APIDiff,
  AffectedDocumentation,
  DocumentationUpdate,
  ReviewDecision,
  ChangeSeverity,
} from '../types';

/**
 * AgentController orchestrates the entire documentation maintenance pipeline
 *
 * Coordinates all components to:
 * 1. Detect code changes
 * 2. Parse and analyze diffs
 * 3. Map to affected documentation
 * 4. Generate updates with AI
 * 5. Review with user
 * 6. Apply approved changes
 *
 * Learning project note:
 * This implementation prioritizes clarity over optimization.
 * Error handling is straightforward, and we process files sequentially
 * rather than in parallel for easier debugging and understanding.
 */
export class AgentController {
  private readonly state: PipelineState;
  private readonly changeDetector: ChangeDetector;
  private readonly codeParser: CodeParser;
  private readonly diffAnalyzer: DiffAnalyzer;
  private readonly documentationMapper: DocumentationMapper;
  private readonly contextBuilder: ContextBuilder;
  private readonly aiGenerator: AIDocumentationGenerator;
  private readonly reviewInterface: ReviewInterface;

  constructor(private readonly config: AgentConfig) {
    // Initialize all components
    this.changeDetector = new ChangeDetector();
    this.changeDetector.initialize(config);

    this.codeParser = new CodeParser();
    this.diffAnalyzer = new DiffAnalyzer();

    this.documentationMapper = new DocumentationMapper(config);
    // Note: DocumentationMapper.initialize() will be called in run() to scan docs

    this.contextBuilder = new ContextBuilder();

    // AI generator needs API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.aiGenerator = new AIDocumentationGenerator(apiKey, config.llmModel, config.temperature);

    this.reviewInterface = new ReviewInterface();

    // Initialize pipeline state
    this.state = {
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      input: { mode: 'git', config }, // Will be updated in run()
      metrics: {
        filesAnalyzed: 0,
        apisChanged: 0,
        docsUpdated: 0,
        executionTime: 0,
      },
    };
  }

  /**
   * Run the complete agent pipeline
   */
  async run(input: AgentInput): Promise<AgentResult> {
    this.state.input = input;
    this.state.startTime = new Date();

    const errors: Error[] = [];
    let updatesGenerated = 0;
    let updatesApplied = 0;

    try {
      // Phase 1: Detect changes
      this.updatePhase('detecting');
      const changes = await this.detectChanges(input);
      this.state.detectedChanges = changes;

      if (changes.length === 0) {
        return this.buildResult(true, 0, 0, [], 'No code changes detected');
      }

      // Phase 2: Parse and analyze
      this.updatePhase('mapping');
      const { parsedCode, diffs } = await this.parseAndAnalyze(changes, errors);
      this.state.parsedCode = parsedCode;

      // Filter diffs by minimum severity
      const filteredDiffs = this.filterDiffsBySeverity(diffs);
      this.state.diffs = filteredDiffs;

      if (filteredDiffs.length === 0) {
        return this.buildResult(
          true,
          0,
          0,
          errors,
          `No changes meet the minimum severity threshold (${input.config.minSeverity})`
        );
      }

      // Count API changes
      for (const diff of filteredDiffs) {
        this.state.metrics.apisChanged +=
          diff.added.length + diff.removed.length + diff.modified.length;
      }

      // Phase 3: Map to affected documentation
      // Initialize documentation mapper (scans doc files)
      await this.documentationMapper.initialize();

      const affectedDocs = await this.mapAffectedDocumentation(filteredDiffs, errors);
      this.state.affectedDocs = affectedDocs;

      if (affectedDocs.files.size === 0) {
        return this.buildResult(true, 0, 0, errors, 'No documentation files affected by changes');
      }

      // Phase 4: Generate updates
      this.updatePhase('generating');
      const updates = await this.generateUpdates(affectedDocs, filteredDiffs, errors);
      this.state.generatedUpdates = updates;
      updatesGenerated = updates.length;

      // Phase 5: Review and apply
      this.updatePhase('reviewing');
      const decisions = await this.reviewUpdates(updates, errors);
      this.state.reviewDecisions = decisions;

      // Phase 6: Apply approved changes
      updatesApplied = await this.applyApprovedUpdates(updates, decisions, errors);
      this.state.metrics.docsUpdated = updatesApplied;

      // Complete
      this.updatePhase('complete');
      this.state.metrics.executionTime = Date.now() - this.state.startTime.getTime();

      return this.buildResult(
        true,
        updatesGenerated,
        updatesApplied,
        errors,
        this.buildSummary(updatesGenerated, updatesApplied, errors)
      );
    } catch (error) {
      errors.push(error as Error);
      return this.buildResult(
        false,
        updatesGenerated,
        updatesApplied,
        errors,
        `Pipeline failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Get current pipeline state
   */
  getState(): AgentState {
    return {
      currentPhase: this.state.input.mode === 'git' ? 'detecting' : 'complete',
      progress: this.calculateProgress(),
      pendingReviews: this.state.generatedUpdates || [],
    };
  }

  /**
   * Detect code changes based on input mode
   */
  private async detectChanges(input: AgentInput): Promise<CodeChange[]> {
    try {
      if (input.mode === 'git') {
        return await this.changeDetector.detectFromGit(input.target);
      } else if (input.mode === 'files') {
        const filePaths = input.target?.split(',') || [];
        return await this.changeDetector.detectFromFiles(filePaths);
      }
      return [];
    } catch (error) {
      throw new Error(`Failed to detect changes: ${(error as Error).message}`);
    }
  }

  /**
   * Parse code and analyze diffs
   */
  private async parseAndAnalyze(
    changes: CodeChange[],
    errors: Error[]
  ): Promise<{ parsedCode: Map<string, ParsedCode>; diffs: APIDiff[] }> {
    const parsedCode = new Map<string, ParsedCode>();
    const diffs: APIDiff[] = [];

    for (const change of changes) {
      try {
        this.state.metrics.filesAnalyzed++;

        // Parse current version
        const newParsed = this.codeParser.parse(change.content, change.language);
        parsedCode.set(change.filePath, newParsed);

        // Parse previous version if it exists
        if (change.previousContent && change.changeType !== 'added') {
          const oldParsed = this.codeParser.parse(change.previousContent, change.language);

          // Analyze diff
          const diff = this.diffAnalyzer.analyze(oldParsed, newParsed);
          diffs.push(diff);
        } else if (change.changeType === 'added') {
          // New file - all APIs are "added"
          diffs.push({
            added: newParsed.apis,
            removed: [],
            modified: [],
            unchanged: [],
          });
        }
      } catch (error) {
        errors.push(new Error(`Failed to parse ${change.filePath}: ${(error as Error).message}`));
      }
    }

    return { parsedCode, diffs };
  }

  /**
   * Filter diffs by minimum severity threshold
   */
  private filterDiffsBySeverity(diffs: APIDiff[]): APIDiff[] {
    const minSeverity = this.config.minSeverity;
    const severityOrder: ChangeSeverity[] = ['patch', 'minor', 'major', 'breaking'];
    const minSeverityIndex = severityOrder.indexOf(minSeverity);

    return diffs.filter((diff) => {
      const severity = this.diffAnalyzer.calculateSeverity(diff);
      const severityIndex = severityOrder.indexOf(severity);
      return severityIndex >= minSeverityIndex;
    });
  }

  /**
   * Map API changes to affected documentation
   */
  private async mapAffectedDocumentation(
    diffs: APIDiff[],
    errors: Error[]
  ): Promise<AffectedDocumentation> {
    try {
      // Combine all diffs into one for mapping
      const combinedDiff: APIDiff = {
        added: diffs.flatMap((d) => d.added),
        removed: diffs.flatMap((d) => d.removed),
        modified: diffs.flatMap((d) => d.modified),
        unchanged: diffs.flatMap((d) => d.unchanged),
      };

      return await this.documentationMapper.mapAffectedDocs(combinedDiff);
    } catch (error) {
      errors.push(new Error(`Failed to map documentation: ${(error as Error).message}`));
      return {
        files: new Map(),
        totalReferences: 0,
        missingDocs: [],
      };
    }
  }

  /**
   * Generate documentation updates using AI
   */
  private async generateUpdates(
    affectedDocs: AffectedDocumentation,
    diffs: APIDiff[],
    errors: Error[]
  ): Promise<DocumentationUpdate[]> {
    const updates: DocumentationUpdate[] = [];

    // Combine all diffs for context
    const combinedDiff: APIDiff = {
      added: diffs.flatMap((d) => d.added),
      removed: diffs.flatMap((d) => d.removed),
      modified: diffs.flatMap((d) => d.modified),
      unchanged: diffs.flatMap((d) => d.unchanged),
    };

    // Build context once for all updates
    const context = this.contextBuilder.buildContext(
      combinedDiff,
      affectedDocs,
      this.state.input.config
    );

    // Generate update for each affected file
    for (const [filePath, docFile] of affectedDocs.files) {
      try {
        const update = await this.aiGenerator.generateUpdate(docFile, context);
        updates.push(update);
      } catch (error) {
        errors.push(
          new Error(`Failed to generate update for ${filePath}: ${(error as Error).message}`)
        );
      }
    }

    return updates;
  }

  /**
   * Review updates with user
   */
  private async reviewUpdates(
    updates: DocumentationUpdate[],
    errors: Error[]
  ): Promise<ReviewDecision[]> {
    try {
      return await this.reviewInterface.presentBatch(updates);
    } catch (error) {
      errors.push(new Error(`Review failed: ${(error as Error).message}`));
      // Return reject decisions for all updates
      return updates.map(() => ({ action: 'reject', feedback: 'Review failed' }));
    }
  }

  /**
   * Apply approved documentation updates to file system
   */
  private async applyApprovedUpdates(
    updates: DocumentationUpdate[],
    decisions: ReviewDecision[],
    errors: Error[]
  ): Promise<number> {
    let appliedCount = 0;

    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const decision = decisions[i];

      if (decision.action === 'approve' || decision.action === 'edit') {
        try {
          const contentToWrite =
            decision.action === 'edit' && decision.editedContent
              ? decision.editedContent
              : update.updatedContent;

          await this.writeDocumentationFile(update.filePath, contentToWrite);
          appliedCount++;
        } catch (error) {
          errors.push(new Error(`Failed to write ${update.filePath}: ${(error as Error).message}`));
        }
      }
    }

    return appliedCount;
  }

  /**
   * Write documentation file with backup
   */
  private async writeDocumentationFile(filePath: string, content: string): Promise<void> {
    // Create backup of original file
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup`;
      fs.copyFileSync(filePath, backupPath);
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write new content
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Update current pipeline phase
   */
  private updatePhase(phase: AgentState['currentPhase']): void {
    // In a real implementation, this would emit events or update UI
    // For now, we just track it in state
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgress(): number {
    // Simple progress calculation based on phase
    // In a real implementation, this would be more sophisticated
    return 0;
  }

  /**
   * Build final result object
   */
  private buildResult(
    success: boolean,
    updatesGenerated: number,
    updatesApplied: number,
    errors: Error[],
    summary: string
  ): AgentResult {
    return {
      success,
      updatesGenerated,
      updatesApplied,
      errors,
      summary,
    };
  }

  /**
   * Build human-readable summary
   */
  private buildSummary(updatesGenerated: number, updatesApplied: number, errors: Error[]): string {
    const parts: string[] = [];

    parts.push(`Generated ${updatesGenerated} documentation update(s)`);
    parts.push(`Applied ${updatesApplied} update(s)`);

    if (errors.length > 0) {
      parts.push(`Encountered ${errors.length} error(s)`);
    }

    parts.push(`Analyzed ${this.state.metrics.filesAnalyzed} file(s)`);
    parts.push(`Found ${this.state.metrics.apisChanged} API change(s)`);

    return parts.join('. ') + '.';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }
}
