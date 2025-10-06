# Documentation Maintenance Agent

An AI-powered system that automatically keeps documentation synchronized with code changes.

## Overview

The Documentation Maintenance Agent monitors code repositories for API changes, function signature modifications, and structural updates, then intelligently updates relevant documentation to reflect these changes. This hybrid agent combines deterministic code analysis with AI-powered natural language generation.

**This is a learning project** focused on understanding agent architecture patterns, hybrid deterministic/AI systems, and practical LLM integration.

## Features

- 🔍 **Automatic Change Detection**: Monitors git commits or specific files for API changes
- 🧠 **Intelligent Parsing**: Analyzes JavaScript/TypeScript code using AST parsing
- 📊 **Diff Analysis**: Identifies added, removed, and modified APIs with severity classification
- 🔗 **Smart Mapping**: Finds all documentation references and code examples affected by changes
- ✨ **AI-Powered Updates**: Generates contextual documentation updates using Claude (Anthropic)
- 👀 **Interactive Review**: Review and approve changes before applying them
- 💾 **Safe Updates**: Creates backups before modifying documentation files

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- Git repository (for change detection)
- Anthropic API key (for AI generation)

### Setup

1. Clone or install the project:

```bash
npm install
```

2. Build the project:

```bash
npm run build
```

3. Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

4. Initialize configuration:

```bash
node dist/cli.js init
```

## Quick Start

1. Make changes to your code
2. Commit your changes to git
3. Run the agent:

```bash
node dist/cli.js run
```

4. Review the proposed documentation updates
5. Approve or reject each change

The agent will automatically:
- Detect what changed in your code
- Find affected documentation
- Generate updated documentation
- Present changes for your review
- Apply approved updates

## Usage

### Commands

#### `doc-agent run`

Run the documentation maintenance agent to analyze changes and update documentation.

```bash
node dist/cli.js run [options]
```

**Options:**

- `--files <paths...>` - Analyze specific files instead of git changes
  ```bash
  node dist/cli.js run --files src/api.ts src/utils.ts
  ```

- `--commit <hash>` - Analyze changes from a specific commit (default: HEAD)
  ```bash
  node dist/cli.js run --commit abc123
  ```

- `--config <path>` - Use a custom configuration file (default: .doc-agent.config.json)
  ```bash
  node dist/cli.js run --config custom-config.json
  ```

- `--verbose` - Enable verbose logging to see detailed execution information
  ```bash
  node dist/cli.js run --verbose
  ```

- `--debug` - Enable debug mode with stack traces for errors
  ```bash
  node dist/cli.js run --debug
  ```

#### `doc-agent init`

Create a sample configuration file with default settings.

```bash
node dist/cli.js init [options]
```

**Options:**

- `--output <path>` - Specify output path for config file (default: .doc-agent.config.json)
  ```bash
  node dist/cli.js init --output my-config.json
  ```

### Examples

**Analyze changes since last commit:**
```bash
node dist/cli.js run
```

**Analyze specific files:**
```bash
node dist/cli.js run --files src/api.ts src/types.ts
```

**Analyze a specific commit:**
```bash
node dist/cli.js run --commit HEAD~1
```

**Use verbose output to see what's happening:**
```bash
node dist/cli.js run --verbose
```

**Use a custom configuration:**
```bash
node dist/cli.js run --config .doc-agent.prod.json
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

## How It Works

The agent follows a pipeline architecture:

1. **Detection Phase**: Detects code changes via git diff or file analysis
2. **Parsing Phase**: Parses code into AST and extracts API elements
3. **Analysis Phase**: Compares old and new code to identify specific changes
4. **Mapping Phase**: Finds all documentation files that reference changed APIs
5. **Generation Phase**: Uses AI to generate updated documentation
6. **Review Phase**: Presents changes for user approval
7. **Application Phase**: Applies approved changes to documentation files

## Development

### Build Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

### Running Tests

```bash
# Run all tests once
npm run test

# Run tests in watch mode during development
npm run test:watch
```

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable is required"

Make sure you've set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

To make it permanent, add it to your shell profile (~/.bashrc, ~/.zshrc, etc.):

```bash
echo 'export ANTHROPIC_API_KEY=your-api-key-here' >> ~/.zshrc
```

### "No code changes detected"

This means the agent couldn't find any changes. Make sure:
- You're in a git repository
- You have uncommitted changes or recent commits
- Your `codePaths` configuration includes the files you changed

### "No documentation files affected by changes"

The agent found code changes but couldn't find any documentation that references them. This could mean:
- Your documentation doesn't reference the changed APIs
- Your `documentationPaths` configuration doesn't include the right files
- The changed code is internal and doesn't affect public APIs

## Development Status

**Version 1.0 - Core Implementation Complete**

This is the initial version focusing on manual CLI execution with interactive feedback.

### Completed
- ✅ Project structure and tooling setup
- ✅ TypeScript configuration with strict mode
- ✅ Core type definitions
- ✅ Configuration management with validation
- ✅ Git-based change detection
- ✅ Code parsing for JavaScript/TypeScript
- ✅ Diff analysis with severity classification
- ✅ Documentation mapping and reference finding
- ✅ Context building for AI prompts
- ✅ AI documentation generation (Anthropic/Claude)
- ✅ Interactive review interface
- ✅ Agent orchestration and pipeline
- ✅ CLI interface with commands

### Next Steps
- 🔄 End-to-end testing
- 🔄 Performance optimization
- 🔄 Additional documentation and examples

## License

MIT
