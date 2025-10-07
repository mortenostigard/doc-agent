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

- `--yes` - Auto-approve all documentation updates without prompting
  ```bash
  node dist/cli.js run --yes
  ```

- `--verbose` - Enable verbose logging to see detailed execution information
  ```bash
  node dist/cli.js run --verbose
  ```

- `--debug` - Enable debug mode with detailed output and stack traces
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

**Debug mode for troubleshooting:**
```bash
node dist/cli.js run --debug
```

**Auto-approve all changes (use with caution):**
```bash
node dist/cli.js run --yes
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
  "minSeverity": "minor",
  "generateMissingDocs": false,
  "llmProvider": "anthropic",
  "llmModel": "claude-3-7-sonnet-20250219",
  "temperature": 0.3,
  "documentationFormat": "markdown",
  "mode": "manual"
}
```

### Configuration Options

- **documentationPaths** (string[]): Glob patterns for documentation files to monitor
  - Example: `["docs/**/*.md", "README.md"]`
  
- **codePaths** (string[]): Glob patterns for code files to analyze
  - Example: `["src/**/*.ts", "src/**/*.js"]`
  
- **ignorePaths** (string[]): Glob patterns for files to ignore
  - Example: `["node_modules/**", "dist/**", "*.test.ts"]`
  
- **minSeverity** (string): Minimum change severity to trigger updates
  - Options: `"breaking"`, `"major"`, `"minor"`, `"patch"`
  - Default: `"minor"`
  
- **generateMissingDocs** (boolean): Generate documentation for undocumented APIs (not implemented in v1.0)
  - Default: `false`
  
- **llmProvider** (string): AI provider to use
  - Options: `"anthropic"` (only option in v1.0)
  - Default: `"anthropic"`
  
- **llmModel** (string): Model name to use
  - For Anthropic: `"claude-sonnet-4-5-20250929"` (recommended), `"claude-sonnet-4-20250514"`, `"claude-3-7-sonnet-20250219"`
  - Default: `"claude-sonnet-4-5-20250929"`
  
- **temperature** (number): AI temperature setting (0-2)
  - Lower values (0.1-0.3) for more focused, deterministic output
  - Higher values (0.7-1.0) for more creative output
  - Default: `0.3`
  
- **documentationFormat** (string): Documentation format
  - Options: `"markdown"` (only option in v1.0)
  - Default: `"markdown"`
  
- **mode** (string): Execution mode
  - Options: `"manual"` (only option in v1.0)
  - Default: `"manual"`

## Project Structure

```
doc-agent/
├── src/
│   ├── cli.ts                      # CLI entry point
│   ├── index.ts                    # Main exports
│   ├── types/
│   │   └── index.ts                # Core type definitions
│   ├── config/
│   │   └── ConfigManager.ts        # Configuration management
│   ├── controller/
│   │   └── AgentController.ts      # Main pipeline orchestrator
│   ├── detection/
│   │   └── ChangeDetector.ts       # Git and file change detection
│   ├── parsing/
│   │   └── CodeParser.ts           # AST parsing for code analysis
│   ├── diff/
│   │   └── DiffAnalyzer.ts         # API diff analysis
│   ├── mapping/
│   │   └── DocumentationMapper.ts  # Documentation reference mapping
│   ├── context/
│   │   └── ContextBuilder.ts       # Context building for AI
│   ├── generation/
│   │   └── AIDocumentationGenerator.ts  # AI-powered doc generation
│   ├── review/
│   │   └── ReviewInterface.ts      # Interactive review UI
│   └── utils/
│       ├── FileManager.ts          # File operations
│       └── Logger.ts               # Structured logging
├── dist/                           # Compiled output
├── coverage/                       # Test coverage reports
├── docs/                           # Project documentation
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

## Logging and Debugging

The agent includes structured logging to help you understand what's happening during execution.

### Log Levels

- **Normal mode**: Shows only errors and warnings
- **Verbose mode** (`--verbose`): Shows info messages, phase transitions, and metrics
- **Debug mode** (`--debug`): Shows everything including detailed debug information and stack traces

### Example Output

**Verbose mode:**
```bash
$ node dist/cli.js run --verbose

🤖 Documentation Maintenance Agent

📝 Mode: Analyzing changes since last commit

🚀 Starting agent pipeline...

▶ Phase: Detecting changes
  Changes detected: 3

▶ Phase: Parsing and analyzing code
  Files parsed: 3
  Diffs found: 2

▶ Phase: Mapping to affected documentation
  Affected docs: 1

▶ Phase: Generating documentation updates
  Updates generated: 1

▶ Phase: Reviewing updates
[Review interface...]

▶ Phase: Applying approved updates
  Updates applied: 1
  Execution time: 2341ms

✅ Agent execution completed successfully!
```

**Debug mode:**
```bash
$ node dist/cli.js run --debug

# Shows all verbose output plus:
# - Detailed data structures
# - Full error stack traces
# - Internal state information
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

**Version 1.0 - Core Implementation Complete** ✅

This is the initial version focusing on manual CLI execution with interactive feedback.

### What's Included in v1.0

- ✅ **Manual CLI execution** - Run on-demand to update docs
- ✅ **Git-based change detection** - Analyze commits
- ✅ **File-based change detection** - Analyze specific files
- ✅ **TypeScript/JavaScript support** - AST-based code parsing
- ✅ **Anthropic Claude integration** - AI-powered doc generation
- ✅ **Interactive review** - Approve/reject each change
- ✅ **Diff display** - See exactly what will change
- ✅ **Structured logging** - Debug and verbose modes
- ✅ **Comprehensive tests** - 151 tests with E2E coverage

### v1.0 Limitations

**Only Anthropic Claude is supported:**
- ❌ OpenAI GPT models - planned for v2.0
- ❌ Local models - planned for future release

**Only manual mode:**
- ❌ Automatic git hooks - you can set these up manually (see examples)
- ❌ Built-in CI/CD integration - you can integrate manually (see examples)
- ❌ Watch mode - planned for future release

**Only Markdown:**
- ❌ MDX support - planned for future release
- ❌ Other formats - not planned

**Only updates existing docs:**
- ❌ Generating docs for undocumented APIs - planned for future release

**Only TypeScript/JavaScript:**
- ❌ Python, Java, Go, etc. - planned for future releases

### Future Enhancements

- 🔮 Support for additional LLM providers (OpenAI, local models)
- 🔮 Automatic git hooks integration (pre-commit, post-commit)
- 🔮 Built-in CI/CD integration modes
- 🔮 Performance optimization and caching
- 🔮 Watch mode for continuous monitoring
- 🔮 Generate documentation for undocumented APIs
- 🔮 Support for more languages (Python, Java, etc.)
- 🔮 MDX format support

## Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation and configuration guide
- **[Usage Guide](docs/USAGE.md)** - Practical workflows and examples
- **[Configuration Reference](docs/CONFIGURATION.md)** - Detailed configuration options
- **[Examples](docs/EXAMPLES.md)** - Real-world usage scenarios

## License

MIT
