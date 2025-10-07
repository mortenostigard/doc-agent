import chalk from 'chalk';

/**
 * Log levels for the agent
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple structured logger for the documentation agent
 * 
 * Respects verbosity settings:
 * - Normal: Only errors and warnings
 * - Verbose: Info messages + errors/warnings
 * - Debug: Everything including debug messages
 */
export class Logger {
  private readonly verbose: boolean;
  private readonly debug: boolean;

  constructor(verbose: boolean = false, debug: boolean = false) {
    this.verbose = verbose;
    this.debug = debug;
  }

  /**
   * Log debug information (only shown with --debug)
   */
  logDebug(message: string, data?: any): void {
    if (this.debug) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
      if (data) {
        console.log(chalk.gray(JSON.stringify(data, null, 2)));
      }
    }
  }

  /**
   * Log informational messages (shown with --verbose or --debug)
   */
  logInfo(message: string): void {
    if (this.verbose || this.debug) {
      console.log(chalk.cyan(`[INFO] ${message}`));
    }
  }

  /**
   * Log warnings (always shown)
   */
  logWarn(message: string): void {
    console.log(chalk.yellow(`[WARN] ${message}`));
  }

  /**
   * Log errors (always shown)
   */
  logError(message: string, error?: Error): void {
    console.error(chalk.red(`[ERROR] ${message}`));
    if (error && this.debug && error.stack) {
      console.error(chalk.gray(error.stack));
    }
  }

  /**
   * Log phase transitions (shown with --verbose or --debug)
   */
  logPhase(phase: string): void {
    if (this.verbose || this.debug) {
      console.log(chalk.magenta(`\n▶ Phase: ${phase}`));
    }
  }

  /**
   * Log metrics (shown with --verbose or --debug)
   */
  logMetric(name: string, value: number | string): void {
    if (this.verbose || this.debug) {
      console.log(chalk.gray(`  ${name}: ${value}`));
    }
  }
}
