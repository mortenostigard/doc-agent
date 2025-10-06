#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './config/ConfigManager.js';
import { AgentController } from './controller/AgentController.js';
import type { AgentInput } from './types/index.js';

const program = new Command();

program
  .name('doc-agent')
  .description('AI-powered documentation maintenance agent')
  .version('1.0.0');

// Main run command
program
  .command('run')
  .description('Run the documentation maintenance agent')
  .option('--files <paths...>', 'Analyze specific files (comma-separated or space-separated)')
  .option('--commit <hash>', 'Analyze changes from a specific commit (default: HEAD)')
  .option('--config <path>', 'Path to configuration file', '.doc-agent.config.json')
  .option('--verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug mode with detailed output')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('\n🤖 Documentation Maintenance Agent\n'));

      // Load configuration
      const configManager = new ConfigManager();
      const config = configManager.load(options.config as string);

      if (options.verbose) {
        console.log(chalk.gray('Configuration loaded:'));
        console.log(chalk.gray(JSON.stringify(config, null, 2)));
        console.log();
      }

      // Determine mode and target
      let mode: 'git' | 'files' | 'watch';
      let target: string | undefined;

      if (options.files) {
        mode = 'files';
        // Handle both comma-separated and space-separated file paths
        const fileList = Array.isArray(options.files) ? options.files : [options.files];
        target = fileList.join(',');
        console.log(chalk.cyan(`📁 Mode: Analyzing specific files`));
        console.log(chalk.gray(`   Files: ${fileList.join(', ')}`));
      } else if (options.commit) {
        mode = 'git';
        target = options.commit as string;
        console.log(chalk.cyan(`📝 Mode: Analyzing git commit ${target}`));
      } else {
        mode = 'git';
        console.log(chalk.cyan(`📝 Mode: Analyzing changes since last commit`));
      }

      console.log();

      // Check for required API key
      if (!process.env.ANTHROPIC_API_KEY && config.llmProvider === 'anthropic') {
        console.error(
          chalk.red('❌ Error: ANTHROPIC_API_KEY environment variable is required')
        );
        console.error(chalk.gray('   Set it with: export ANTHROPIC_API_KEY=your-api-key'));
        process.exit(1);
      }

      // Create agent input
      const input: AgentInput = {
        mode,
        target,
        config,
      };

      // Initialize and run agent
      console.log(chalk.cyan('🚀 Starting agent pipeline...\n'));
      const controller = new AgentController(config);
      const result = await controller.run(input);

      // Display results
      console.log();
      if (result.success) {
        console.log(chalk.green.bold('✅ Agent execution completed successfully!\n'));
        console.log(chalk.white(result.summary));

        if (result.updatesApplied > 0) {
          console.log(
            chalk.green(`\n✨ ${result.updatesApplied} documentation file(s) updated`)
          );
        } else if (result.updatesGenerated > 0) {
          console.log(chalk.yellow(`\n⚠️  ${result.updatesGenerated} update(s) generated but not applied`));
        }
      } else {
        console.log(chalk.red.bold('❌ Agent execution failed\n'));
        console.log(chalk.white(result.summary));
      }

      // Display errors if any
      if (result.errors.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Encountered ${result.errors.length} error(s):`));
        result.errors.forEach((error, index) => {
          console.log(chalk.gray(`   ${index + 1}. ${error.message}`));
        });
      }

      console.log();

      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(chalk.red('\n❌ Fatal error:'), error instanceof Error ? error.message : String(error));
      if (options.debug && error instanceof Error && error.stack) {
        console.error(chalk.gray('\nStack trace:'));
        console.error(chalk.gray(error.stack));
      }
      process.exit(1);
    }
  });

// Init command to create sample configuration
program
  .command('init')
  .description('Create a sample configuration file')
  .option('--output <path>', 'Output path for configuration file', '.doc-agent.config.json')
  .action((options) => {
    try {
      console.log(chalk.blue.bold('\n🤖 Documentation Maintenance Agent - Init\n'));
      ConfigManager.createSampleConfig(options.output as string);
      console.log(chalk.green('\n✅ Configuration file created successfully!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Review and customize the configuration file'));
      console.log(chalk.gray('  2. Set your ANTHROPIC_API_KEY environment variable'));
      console.log(chalk.gray('  3. Run: doc-agent run\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
