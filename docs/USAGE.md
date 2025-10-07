# Usage Guide

Practical guide to using the Documentation Maintenance Agent in your daily workflow.

## Basic Workflow

The typical workflow follows these steps:

1. **Make code changes** - Modify your code as usual
2. **Run the agent** - Analyze changes and generate updates
3. **Review updates** - Approve or reject proposed changes
4. **Commit** - Commit both code and documentation changes together

## Common Use Cases

### 1. After Making Code Changes

The most common scenario - you've modified some code and want to update the docs:

```bash
# Make your code changes
vim src/api.ts

# Run the agent to update docs
node dist/cli.js run --verbose

# Review and approve changes
# Then commit everything together
git add .
git commit -m "feat: update API and documentation"
```

### 2. Analyzing Specific Files

When you want to focus on specific files:

```bash
# Single file
node dist/cli.js run --files src/api.ts

# Multiple files
node dist/cli.js run --files src/api.ts src/utils.ts src/types.ts

# With verbose output
node dist/cli.js run --files src/api.ts --verbose
```

### 3. Reviewing Past Changes

Analyze changes from a specific commit:

```bash
# Analyze the last commit
node dist/cli.js run --commit HEAD

# Analyze a specific commit
node dist/cli.js run --commit abc123

# Analyze changes from 3 commits ago
node dist/cli.js run --commit HEAD~3
```

### 4. Batch Processing (Auto-Approve)

When you trust the agent and want to process many changes:

```bash
# Auto-approve all changes (use with caution!)
node dist/cli.js run --yes

# Combine with verbose to see what's happening
node dist/cli.js run --yes --verbose
```

**⚠️ Warning:** Always review auto-approved changes before committing!

### 5. Debugging Issues

When something isn't working as expected:

```bash
# Enable debug mode for detailed output
node dist/cli.js run --debug

# Check what files are being analyzed
node dist/cli.js run --verbose --files src/**/*.ts

# Test with a single file first
node dist/cli.js run --debug --files src/simple.ts
```

## Interactive Review

When the agent finds documentation to update, you'll see an interactive review screen.

### Review Options

For each proposed update, you can:

- **[a]pprove** - Accept the change and apply it
- **[r]eject** - Reject the change, keep original
- **[s]kip** - Skip for now, decide later
- **[q]uit** - Exit without applying any more changes

### Review Screen Example

```
Review 1 of 3

================================================================================
Documentation Update: docs/api.md
================================================================================

Reasoning:
Updated function signature from calculateTotal(items) to calculateTotal(items, tax)

Changes:
  ## calculateTotal
  
- Calculates the total price of items.
+ Calculates the total price of items including tax.
  
  **Parameters:**
  - `items` (Item[]): Array of items
+ - `tax` (number): Tax rate (0-1)
  
- **Returns:** Total price
+ **Returns:** Total price including tax

[a]pprove, [r]eject, [s]kip, [q]uit? a

✓ Approved
```

### Tips for Reviewing

1. **Read the reasoning** - Understand why the change is being made
2. **Check the diff** - Verify the changes are accurate
3. **Look for context** - Make sure surrounding text still makes sense
4. **Verify examples** - Ensure code examples are updated correctly
5. **Check completeness** - Confirm all relevant parts are updated

## Configuration Tips

### Adjusting Sensitivity

Control how many updates you get by adjusting `minSeverity`:

```json
{
  "minSeverity": "breaking"  // Only breaking changes
}
```

Options from most to least sensitive:
- `"patch"` - All changes (very noisy)
- `"minor"` - Minor changes and above (recommended)
- `"major"` - Major changes and above
- `"breaking"` - Only breaking changes (very quiet)

### Focusing on Specific Docs

Limit which documentation files are updated:

```json
{
  "documentationPaths": [
    "docs/api/**/*.md",  // Only API docs
    "README.md"          // And the README
  ]
}
```

### Ignoring Test Files

Prevent test files from triggering updates:

```json
{
  "ignorePaths": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**",
    "test/**",
    "tests/**"
  ]
}
```

## Advanced Workflows

### Pre-Commit Hook

Run the agent before each commit:

1. Create `.git/hooks/pre-commit`:
   ```bash
   #!/bin/bash
   
   # Run doc agent on staged files
   STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js)$')
   
   if [ -n "$STAGED_FILES" ]; then
     echo "Running documentation agent..."
     node dist/cli.js run --yes
     
     # Stage any documentation changes
     git add docs/**/*.md README.md
   fi
   ```

2. Make it executable:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

### CI/CD Integration

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
name: Documentation Check

on: [pull_request]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install doc-agent
        run: npm install -g doc-agent
      
      - name: Check documentation
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          doc-agent run --yes
          
          # Check if docs were updated
          if [[ -n $(git status -s docs/) ]]; then
            echo "Documentation needs updating!"
            exit 1
          fi
```

### Multiple Projects

Use different configs for different projects:

```bash
# Project A (strict)
node dist/cli.js run --config .doc-agent.strict.json

# Project B (relaxed)
node dist/cli.js run --config .doc-agent.relaxed.json
```

Example strict config:
```json
{
  "minSeverity": "minor",
  "temperature": 0.1,
  "generateMissingDocs": true
}
```

Example relaxed config:
```json
{
  "minSeverity": "major",
  "temperature": 0.5,
  "generateMissingDocs": false
}
```

## Best Practices

### 1. Start Small

Begin with a single file to understand the agent's behavior:

```bash
node dist/cli.js run --files src/simple-api.ts --verbose
```

### 2. Review Everything Initially

Don't use `--yes` until you trust the agent's output:

```bash
# Good for learning
node dist/cli.js run --verbose

# Skip this initially
node dist/cli.js run --yes  # Wait until you're comfortable
```

### 3. Commit Docs with Code

Always commit documentation updates with the code changes:

```bash
git add src/api.ts docs/api.md
git commit -m "feat: add new API endpoint with documentation"
```

### 4. Use Verbose Mode

Enable verbose mode to understand what's happening:

```bash
node dist/cli.js run --verbose
```

### 5. Keep Configs in Version Control

Commit your configuration file:

```bash
git add .doc-agent.config.json
git commit -m "chore: add doc-agent configuration"
```

### 6. Regular Updates

Run the agent regularly, not just before releases:

```bash
# After each feature
git commit -m "feat: new feature"
node dist/cli.js run

# Before each PR
node dist/cli.js run --verbose
```

## Troubleshooting Common Issues

### No Changes Detected

```bash
# Check what files are being analyzed
node dist/cli.js run --verbose

# Try specific files
node dist/cli.js run --files src/yourfile.ts --debug
```

### Too Many Updates

Adjust sensitivity:
```json
{
  "minSeverity": "major"  // Reduce noise
}
```

### Wrong Documentation Updated

Check your path patterns:
```json
{
  "documentationPaths": [
    "docs/api/**/*.md"  // Be more specific
  ]
}
```

### Poor Quality Updates

Adjust temperature:
```json
{
  "temperature": 0.1  // More focused output
}
```

## Getting Help

- Run with `--debug` for detailed output
- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review your configuration file
- Start with simple test cases

## Next Steps

- Read the [Configuration Reference](CONFIGURATION.md) for all options
- Check [Examples](EXAMPLES.md) for real-world scenarios
- Review [Troubleshooting](TROUBLESHOOTING.md) for common issues
