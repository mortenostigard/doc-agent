#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigManager } from './config/ConfigManager';

const program = new Command();

program
  .name('doc-agent')
  .description('AI-powered documentation maintenance agent')
  .version('1.0.0');

// Main run command
program
  .command('run')
  .description('Run the documentation maintenance agent')
  .option('--files <paths...>', 'Analyze specific files')
  .option('--commit <hash>', 'Analyze changes from a specific commit')
  .option('--config <path>', 'Path to configuration file', '.doc-agent.config.json')
  .option('--verbose', 'Enable verbose logging')
  .option('--debug', 'Enable debug mode')
  .action(async (options) => {
    try {
      console.log('Starting Documentation Maintenance Agent...');

      // Load configuration
      const configManager = new ConfigManager();
      const config = configManager.load(options.config as string);

      if (options.verbose) {
        console.log('Configuration loaded:', JSON.stringify(config, null, 2));
      }

      // Determine mode
      let mode: 'git' | 'files' | 'watch' = 'git';
      let target: string | undefined;

      if (options.files) {
        mode = 'files';
        target = (options.files as string[]).join(',');
      } else if (options.commit) {
        mode = 'git';
        target = options.commit as string;
      }

      console.log(`Mode: ${mode}`);
      if (target) {
        console.log(`Target: ${target}`);
      }

      // TODO: Initialize and run AgentController
      console.log('Agent execution not yet implemented. This will be added in future tasks.');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
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
      ConfigManager.createSampleConfig(options.output as string);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse();
