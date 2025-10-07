# Documentation Maintenance Agent

AI-powered tool that automatically keeps documentation synchronized with code changes.

## What It Does

Monitors your code for API changes and intelligently updates documentation using Claude AI. Combines deterministic code analysis with AI-powered natural language generation.

## Installation

```bash
npm install -g doc-agent
export ANTHROPIC_API_KEY=your-api-key-here
```

## Quick Start

```bash
# Initialize in your project
cd your-project
doc-agent init

# Make code changes, then run
doc-agent run

# Review and approve proposed documentation updates
```

## Usage

```bash
# Analyze changes since last commit
doc-agent run

# Analyze specific files
doc-agent run --files src/api.ts

# Auto-approve all changes
doc-agent run --yes

# Verbose output
doc-agent run --verbose
```

## Configuration

Create `.doc-agent.config.json` in your project:

```json
{
  "documentationPaths": ["docs/**/*.md", "README.md"],
  "codePaths": ["src/**/*.ts", "src/**/*.js"],
  "ignorePaths": ["node_modules/**", "dist/**", "*.test.ts"],
  "minSeverity": "minor",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.3
}
```

**Key Options:**
- `minSeverity`: `"breaking"` | `"major"` | `"minor"` | `"patch"` - Minimum change severity to trigger updates
- `llmModel`: Claude model to use (default: `claude-sonnet-4-5-20250929`)
- `temperature`: 0-2, lower = more focused (default: 0.3)

See [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for all options.

## How It Works

1. Detects code changes via git or file analysis
2. Parses code and identifies API changes
3. Finds affected documentation
4. Generates updates using Claude AI
5. Presents changes for review
6. Applies approved updates

## Features

- 🔍 Git-based change detection
- 🧠 AST parsing for TypeScript/JavaScript
- 📊 Severity classification (breaking, major, minor, patch)
- 🔗 Smart documentation mapping
- ✨ AI-powered updates with Claude
- 👀 Interactive review interface
- 💾 Safe updates with backups

## Documentation

- [Configuration Reference](docs/CONFIGURATION.md) - All config options
- [Examples](docs/EXAMPLES.md) - Real-world usage scenarios

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup.

## Version 1.0

**What's included:**
- Manual CLI execution
- TypeScript/JavaScript support
- Anthropic Claude integration
- Interactive review
- Comprehensive tests (151 tests)

**Limitations:**
- Only Anthropic Claude (OpenAI planned for v2.0)
- Only manual mode (git hooks can be set up manually)
- Only Markdown format
- Only updates existing docs (generation planned for future)

## License

MIT
