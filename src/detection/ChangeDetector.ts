import simpleGit, { SimpleGit } from 'simple-git';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CodeChange, AgentConfig } from '../types/index.js';

/**
 * ChangeDetector monitors code changes and triggers the agent pipeline.
 * Uses git to detect changes and filters based on configuration.
 */
export class ChangeDetector {
  private readonly git: SimpleGit;
  private config: AgentConfig | null = null;

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Initialize the detector with configuration
   */
  initialize(config: AgentConfig): void {
    this.config = config;
  }

  /**
   * Detect changes from git diff since the specified commit or last commit
   * @param commitHash Optional commit hash to compare against (defaults to HEAD~1)
   * @returns Array of CodeChange objects
   */
  async detectFromGit(commitHash?: string): Promise<CodeChange[]> {
    if (!this.config) {
      throw new Error('ChangeDetector not initialized. Call initialize() first.');
    }

    try {
      // Get the diff against the specified commit or HEAD~1
      const compareTarget = commitHash || 'HEAD~1';
      const diffSummary = await this.git.diffSummary([compareTarget, 'HEAD']);

      // Process each changed file
      const changes: CodeChange[] = [];

      for (const file of diffSummary.files) {
        // Filter based on configuration
        if (!this.shouldIncludeFile(file.file)) {
          continue;
        }

        const change = await this.createCodeChange(file.file, compareTarget);
        if (change) {
          changes.push(change);
        }
      }

      return changes;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to detect changes from git: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Detect changes from specific file paths
   * @param filePaths Array of file paths to analyze
   * @returns Array of CodeChange objects
   */
  async detectFromFiles(filePaths: string[]): Promise<CodeChange[]> {
    if (!this.config) {
      throw new Error('ChangeDetector not initialized. Call initialize() first.');
    }

    const changes: CodeChange[] = [];

    for (const filePath of filePaths) {
      // Filter based on configuration
      if (!this.shouldIncludeFile(filePath)) {
        continue;
      }

      try {
        const change = await this.createCodeChange(filePath, 'HEAD~1');
        if (change) {
          changes.push(change);
        }
      } catch (error) {
        // Skip files that can't be processed
        console.warn(`Skipping file ${filePath}: ${error}`);
      }
    }

    return changes;
  }

  /**
   * Create a CodeChange object for a given file
   */
  private async createCodeChange(
    filePath: string,
    compareTarget: string
  ): Promise<CodeChange | null> {
    try {
      // Determine change type
      const changeType = await this.getChangeType(filePath, compareTarget);

      // Get current content
      let content = '';
      if (changeType !== 'deleted') {
        try {
          content = await fs.readFile(filePath, 'utf-8');
        } catch (error) {
          // File might not exist in working directory
          content = '';
        }
      }

      // Get previous content
      let previousContent: string | undefined;
      if (changeType !== 'added') {
        try {
          previousContent = await this.git.show([`${compareTarget}:${filePath}`]);
        } catch (error) {
          // File might not exist in previous commit
          previousContent = undefined;
        }
      }

      // Detect language from file extension
      const language = this.detectLanguage(filePath);

      return {
        filePath,
        changeType,
        language,
        content,
        previousContent,
      };
    } catch (error) {
      console.warn(`Failed to create CodeChange for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Determine the type of change for a file
   */
  private async getChangeType(
    filePath: string,
    compareTarget: string
  ): Promise<'added' | 'modified' | 'deleted'> {
    try {
      // Check if file exists in current HEAD
      const existsInCurrent = await this.fileExistsInCommit(filePath, 'HEAD');

      // Check if file exists in compare target
      const existsInPrevious = await this.fileExistsInCommit(filePath, compareTarget);

      if (!existsInPrevious && existsInCurrent) {
        return 'added';
      } else if (existsInPrevious && !existsInCurrent) {
        return 'deleted';
      } else {
        return 'modified';
      }
    } catch (error) {
      // Default to modified if we can't determine
      return 'modified';
    }
  }

  /**
   * Check if a file exists in a specific commit
   */
  private async fileExistsInCommit(filePath: string, commit: string): Promise<boolean> {
    try {
      await this.git.show([`${commit}:${filePath}`]);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.rb': 'ruby',
      '.php': 'php',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Check if a file should be included based on configuration
   */
  private shouldIncludeFile(filePath: string): boolean {
    if (!this.config) {
      return false;
    }

    // Check if file matches ignore patterns
    if (this.matchesPatterns(filePath, this.config.ignorePaths)) {
      return false;
    }

    // Check if file matches code paths
    if (!this.matchesPatterns(filePath, this.config.codePaths)) {
      return false;
    }

    return true;
  }

  /**
   * Check if a file path matches any of the given glob patterns
   */
  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchesGlobPattern(filePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple glob pattern matching
   * Supports: *, **, and exact matches
   * Case-insensitive for better cross-platform compatibility
   */
  private matchesGlobPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    // **/ matches zero or more directories
    // * matches filename parts (not including /)

    let regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*\*\//g, '(?:.+/)?') // **/ becomes optional path segments
      .replace(/\*/g, '[^/]*'); // * matches zero or more non-slash chars

    // Add anchors
    regexPattern = `^${regexPattern}$`;

    // Use case-insensitive matching for better cross-platform compatibility
    const regex = new RegExp(regexPattern, 'i');
    return regex.test(filePath);
  }

  /**
   * Watch for real-time file changes (placeholder for future implementation)
   */
  watch(_callback: (changes: CodeChange[]) => void): void {
    throw new Error('Watch mode not yet implemented');
  }
}
