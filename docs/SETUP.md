# Setup Guide

Complete guide to setting up and configuring the Documentation Maintenance Agent.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18.0.0 or higher** - [Download Node.js](https://nodejs.org/)
- **Git** - For change detection features
- **Anthropic API Key** - [Get your API key](https://console.anthropic.com/)

**Note:** v1.0 only supports Anthropic Claude. OpenAI and other providers are planned for future releases.

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be v18.0.0 or higher

# Check Git
git --version

# Check npm
npm --version
```

## Installation

### Option 1: From Source (Development)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd doc-agent
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Verify installation:**
   ```bash
   node dist/cli.js --version
   ```

### Option 2: Global Installation (Coming Soon)

```bash
npm install -g doc-agent
doc-agent --version
```

## Configuration

### 1. Set Up API Key

The agent requires an Anthropic API key to generate documentation updates.

**For current session:**
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

**For permanent setup (macOS/Linux):**

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):
```bash
echo 'export ANTHROPIC_API_KEY=your-api-key-here' >> ~/.zshrc
source ~/.zshrc
```

**For permanent setup (Windows):**
```powershell
setx ANTHROPIC_API_KEY "your-api-key-here"
```

### 2. Initialize Configuration File

Navigate to your project directory and create a configuration file:

```bash
cd /path/to/your/project
node /path/to/doc-agent/dist/cli.js init
```

This creates `.doc-agent.config.json` with default settings.

### 3. Customize Configuration

Edit `.doc-agent.config.json` to match your project structure:

```json
{
  "documentationPaths": [
    "docs/**/*.md",
    "README.md"
  ],
  "codePaths": [
    "src/**/*.ts",
    "src/**/*.js"
  ],
  "ignorePaths": [
    "node_modules/**",
    "dist/**",
    "*.test.ts"
  ],
  "minSeverity": "minor",
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.3
}
```

#### Key Configuration Options

**documentationPaths**
- Specify where your documentation files are located
- Supports glob patterns
- Example: `["docs/**/*.md", "*.md"]`

**codePaths**
- Specify which code files to analyze
- Supports glob patterns
- Example: `["src/**/*.ts", "lib/**/*.js"]`

**ignorePaths**
- Files and directories to exclude
- Always ignore: `node_modules`, `dist`, test files
- Example: `["build/**", "*.test.ts", "*.spec.js"]`

**minSeverity**
- Controls which changes trigger documentation updates
- Options: `"breaking"`, `"major"`, `"minor"`, `"patch"`
- Recommended: `"minor"` for most projects

**llmModel**
- For Anthropic: `"claude-sonnet-4-5-20250929"` (recommended), `"claude-sonnet-4-20250514"`, `"claude-3-7-sonnet-20250219"`
- Balance between quality and cost

**temperature**
- Controls AI creativity (0-2)
- `0.1-0.3`: More focused and consistent (recommended for docs)
- `0.7-1.0`: More creative and varied

## First Run

### Test with Specific Files

Start with a simple test on specific files:

```bash
node dist/cli.js run --files src/api.ts --verbose
```

This will:
1. Analyze the specified file
2. Show detailed output with `--verbose`
3. Present any documentation updates for review
4. Wait for your approval before making changes

### Analyze Recent Changes

Once comfortable, analyze your recent git changes:

```bash
node dist/cli.js run --verbose
```

This analyzes changes since your last commit.

### Review the Output

The agent will:
1. Show which files changed
2. Display what documentation is affected
3. Present proposed updates with diffs
4. Ask you to approve, reject, or skip each change

Example review screen:
```
Review 1 of 1

================================================================================
Documentation Update: docs/api.md
================================================================================

Reasoning:
Updated function signature from add(a, b) to add(...numbers)

Changes:
  ## add(a, b)
- Adds two numbers together.
+ Adds multiple numbers together.

  **Parameters:**
- - `a` (number): First number
- - `b` (number): Second number
+ - `...numbers` (number[]): Numbers to add

[a]pprove, [r]eject, [s]kip, [q]uit?
```

## Verification

### Check Installation

```bash
# Verify the CLI works
node dist/cli.js --version

# Check configuration
node dist/cli.js run --verbose --files README.md
```

### Run Tests (Development)

If you installed from source:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Check test coverage
npm test -- --coverage
```

## Common Setup Issues

### "Command not found: doc-agent"

If running from source, use the full path:
```bash
node /path/to/doc-agent/dist/cli.js run
```

Or create an alias in your shell profile:
```bash
alias doc-agent="node /path/to/doc-agent/dist/cli.js"
```

### "ANTHROPIC_API_KEY environment variable is required"

Make sure you've set the API key:
```bash
echo $ANTHROPIC_API_KEY  # Should show your key
```

If empty, set it:
```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

### "No code changes detected"

This usually means:
- You're not in a git repository
- You have no uncommitted changes
- Your `codePaths` doesn't match your files

Try analyzing specific files instead:
```bash
node dist/cli.js run --files src/yourfile.ts
```

### "Configuration file not found"

Create one with:
```bash
node dist/cli.js init
```

Or specify a custom path:
```bash
node dist/cli.js run --config /path/to/config.json
```

## Next Steps

Once set up:

1. **Read the [Usage Guide](USAGE.md)** - Learn common workflows
2. **Review [Configuration Reference](CONFIGURATION.md)** - Detailed config options
3. **Check [Examples](EXAMPLES.md)** - See real-world usage patterns
4. **Explore [Troubleshooting](TROUBLESHOOTING.md)** - Solutions to common issues

## Getting Help

If you encounter issues:

1. Run with `--debug` flag for detailed output
2. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
3. Review your configuration file
4. Verify your API key is set correctly
5. Check that your paths match your project structure
