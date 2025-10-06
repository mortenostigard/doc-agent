# Documentation Maintenance Agent

An AI-powered system that automatically keeps documentation synchronized with code changes.

## Overview

The Documentation Maintenance Agent monitors code repositories for API changes, function signature modifications, and structural updates, then intelligently updates relevant documentation to reflect these changes. This hybrid agent combines deterministic code analysis with AI-powered natural language generation.

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

## Usage

### Initialize Configuration

Create a sample configuration file:

```bash
npm run build
node dist/cli.js init
```

This creates a `.doc-agent.config.json` file with default settings.

### Run the Agent

```bash
# Analyze changes since last commit
node dist/cli.js run

# Analyze specific files
node dist/cli.js run --files src/api.ts src/utils.ts

# Analyze specific commit
node dist/cli.js run --commit abc123

# Use custom config file
node dist/cli.js run --config custom-config.json

# Verbose output
node dist/cli.js run --verbose
```

## Configuration

The agent is configured via `.doc-agent.config.json`:

```json
{
  "documentationPaths": ["docs/**/*.md", "README.md"],
  "codePaths": ["src/**/*.ts", "src/**/*.js"],
  "ignorePaths": ["node_modules/**", "dist/**", "test/**"],
  "autoApprove": false,
  "minSeverity": "minor",
  "generateMissingDocs": false,
  "llmProvider": "openai",
  "llmModel": "gpt-4-turbo",
  "temperature": 0.3,
  "documentationFormat": "markdown",
  "mode": "manual"
}
```

### Configuration Options

- **documentationPaths**: Glob patterns for documentation files to monitor
- **codePaths**: Glob patterns for code files to analyze
- **ignorePaths**: Glob patterns for files to ignore
- **autoApprove**: Automatically apply updates without review (default: false)
- **minSeverity**: Minimum change severity to trigger updates (breaking, major, minor, patch)
- **generateMissingDocs**: Generate documentation for undocumented APIs
- **llmProvider**: AI provider (openai, anthropic, local)
- **llmModel**: Model name to use
- **temperature**: AI temperature setting (0-2)
- **documentationFormat**: Documentation format (markdown, mdx)
- **mode**: Execution mode (manual, pre-commit, post-commit, ci)

## Project Structure

```
doc-agent/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── index.ts            # Main exports
│   ├── types/
│   │   └── index.ts        # Core type definitions
│   ├── config/
│   │   └── ConfigManager.ts # Configuration management
│   └── components/         # Agent components (to be implemented)
├── dist/                   # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Development Status

**Version 1.0 - In Progress**

This is the initial version focusing on manual CLI execution with interactive feedback.

### Completed
- ✅ Project structure and tooling setup
- ✅ TypeScript configuration
- ✅ Core type definitions
- ✅ Configuration management
- ✅ CLI framework

### In Progress
- 🔄 Change detection
- 🔄 Code parsing
- 🔄 Diff analysis
- 🔄 Documentation mapping
- 🔄 AI generation
- 🔄 Review interface
- 🔄 Agent orchestration

## License

MIT
