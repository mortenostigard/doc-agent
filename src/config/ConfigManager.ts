import * as fs from 'fs';
import * as path from 'path';
import { AgentConfig } from '../types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: AgentConfig = {
  documentationPaths: ['docs/**/*.md', 'README.md'],
  codePaths: ['src/**/*.ts', 'src/**/*.js'],
  ignorePaths: ['node_modules/**', 'dist/**', 'test/**', 'tests/**'],
  minSeverity: 'minor',
  generateMissingDocs: false,
  llmProvider: 'anthropic',
  llmModel: 'claude-sonnet-4-5-20250929',
  temperature: 0.3,
  documentationFormat: 'markdown',
  mode: 'manual',
};

/**
 * Configuration Manager
 * Handles loading and validation of agent configuration
 */
export class ConfigManager {
  private config: AgentConfig;

  constructor() {
    this.config = DEFAULT_CONFIG;
  }

  /**
   * Load configuration from file
   * @param configPath Path to configuration file (default: .doc-agent.config.json)
   * @returns Loaded configuration
   */
  load(configPath: string = '.doc-agent.config.json'): AgentConfig {
    try {
      const fullPath = path.resolve(process.cwd(), configPath);

      if (!fs.existsSync(fullPath)) {
        console.warn(`Configuration file not found at ${fullPath}. Using default configuration.`);
        return this.config;
      }

      const fileContent = fs.readFileSync(fullPath, 'utf-8');
      const userConfig = JSON.parse(fileContent) as Partial<AgentConfig>;

      // Merge with defaults
      this.config = {
        ...DEFAULT_CONFIG,
        ...userConfig,
      };

      // Validate configuration
      this.validate();

      return this.config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in configuration file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }

  /**
   * Validate configuration
   * @throws Error if configuration is invalid
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate paths
    if (
      !Array.isArray(this.config.documentationPaths) ||
      this.config.documentationPaths.length === 0
    ) {
      errors.push('documentationPaths must be a non-empty array');
    }

    if (!Array.isArray(this.config.codePaths) || this.config.codePaths.length === 0) {
      errors.push('codePaths must be a non-empty array');
    }

    // Validate severity
    const validSeverities = ['breaking', 'major', 'minor', 'patch'];
    if (!validSeverities.includes(this.config.minSeverity)) {
      errors.push(`minSeverity must be one of: ${validSeverities.join(', ')}`);
    }

    // Validate LLM provider
    const validProviders = ['openai', 'anthropic', 'local'];
    if (!validProviders.includes(this.config.llmProvider)) {
      errors.push(`llmProvider must be one of: ${validProviders.join(', ')}`);
    }

    // Validate temperature
    if (this.config.temperature < 0 || this.config.temperature > 2) {
      errors.push('temperature must be between 0 and 2');
    }

    // Validate documentation format
    const validFormats = ['markdown', 'mdx'];
    if (!validFormats.includes(this.config.documentationFormat)) {
      errors.push(`documentationFormat must be one of: ${validFormats.join(', ')}`);
    }

    // Validate mode
    const validModes = ['manual', 'pre-commit', 'post-commit', 'ci'];
    if (!validModes.includes(this.config.mode)) {
      errors.push(`mode must be one of: ${validModes.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Create a sample configuration file
   * @param outputPath Path where to create the config file
   */
  static createSampleConfig(outputPath: string = '.doc-agent.config.json'): void {
    const sampleConfig = {
      documentationPaths: ['docs/**/*.md', 'README.md'],
      codePaths: ['src/**/*.ts', 'src/**/*.js'],
      ignorePaths: ['node_modules/**', 'dist/**', 'test/**'],
      minSeverity: 'minor',
      generateMissingDocs: false,
      llmProvider: 'anthropic',
      llmModel: 'claude-sonnet-4-5-20250929',
      temperature: 0.3,
      documentationFormat: 'markdown',
      mode: 'manual',
    };

    const fullPath = path.resolve(process.cwd(), outputPath);
    fs.writeFileSync(fullPath, JSON.stringify(sampleConfig, null, 2), 'utf-8');
    console.log(`Sample configuration created at ${fullPath}`);
  }
}
