# Configuration Reference

Complete reference for all configuration options in the Documentation Maintenance Agent.

## Configuration File

The agent is configured via `.doc-agent.config.json` in your project root.

### Creating a Configuration File

```bash
# Create with default settings
node dist/cli.js init

# Create with custom path
node dist/cli.js init --output custom-config.json
```

### Example Configuration

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
  "generateMissingDocs": false,
  "llmProvider": "anthropic",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.3,
  "documentationFormat": "markdown",
  "mode": "manual"
}
```

## Configuration Options

### documentationPaths

**Type:** `string[]`  
**Required:** Yes  
**Default:** `["docs/**/*.md", "README.md"]`

Glob patterns specifying which documentation files to monitor and update.

**Examples:**

```json
{
  "documentationPaths": [
    "docs/**/*.md",           // All markdown in docs/
    "README.md",              // Root README
    "*.md",                   // All markdown in root
    "docs/api/**/*.md"        // Only API docs
  ]
}
```

**Tips:**
- Use `**` for recursive directory matching
- Be specific to avoid updating unintended files
- Include both API docs and guides

---

### codePaths

**Type:** `string[]`  
**Required:** Yes  
**Default:** `["src/**/*.ts", "src/**/*.js"]`

Glob patterns specifying which code files to analyze for changes.

**Examples:**

```json
{
  "codePaths": [
    "src/**/*.ts",            // All TypeScript in src/
    "src/**/*.js",            // All JavaScript in src/
    "lib/**/*.ts",            // Additional library code
    "packages/*/src/**/*.ts"  // Monorepo structure
  ]
}
```

**Tips:**
- Include all source code directories
- Exclude build output and test files
- Match your project structure

---

### ignorePaths

**Type:** `string[]`  
**Required:** No  
**Default:** `["node_modules/**", "dist/**", "test/**", "*.test.ts"]`

Glob patterns for files and directories to exclude from analysis.

**Examples:**

```json
{
  "ignorePaths": [
    "node_modules/**",        // Dependencies
    "dist/**",                // Build output
    "build/**",               // Build output
    "*.test.ts",              // Test files
    "*.spec.ts",              // Spec files
    "**/__tests__/**",        // Test directories
    "**/__mocks__/**",        // Mock directories
    "coverage/**",            // Coverage reports
    ".git/**"                 // Git directory
  ]
}
```

**Tips:**
- Always ignore `node_modules` and build directories
- Exclude test files to reduce noise
- Add project-specific ignore patterns

---

### minSeverity

**Type:** `"breaking" | "major" | "minor" | "patch"`  
**Required:** No  
**Default:** `"minor"`

Minimum change severity required to trigger documentation updates.

**Severity Levels:**

- **`"breaking"`** - Only breaking changes (removed APIs, incompatible changes)
- **`"major"`** - Major changes (new required parameters, significant behavior changes)
- **`"minor"`** - Minor changes (new optional parameters, new methods)
- **`"patch"`** - All changes (documentation fixes, minor tweaks)

**Examples:**

```json
{
  "minSeverity": "minor"  // Recommended for most projects
}
```

```json
{
  "minSeverity": "breaking"  // Only critical changes
}
```

**Choosing the Right Level:**

| Level | Use When | Updates |
|-------|----------|---------|
| `patch` | You want every change documented | Very frequent |
| `minor` | Balanced approach (recommended) | Moderate |
| `major` | Only significant changes matter | Infrequent |
| `breaking` | Only breaking changes need docs | Rare |

---

### generateMissingDocs

**Type:** `boolean`  
**Required:** No  
**Default:** `false`

Whether to generate documentation for APIs that don't have any documentation yet.

**Examples:**

```json
{
  "generateMissingDocs": false  // Only update existing docs
}
```

```json
{
  "generateMissingDocs": true   // Create docs for undocumented APIs
}
```

**Note:** 🔮 This feature is **not implemented in v1.0**. It is planned for a future release. Currently, the agent only updates existing documentation.

---

### llmProvider

**Type:** `"anthropic"`  
**Required:** No  
**Default:** `"anthropic"`

AI provider to use for generating documentation updates.

**Supported Providers in v1.0:**

- **`"anthropic"`** - Anthropic Claude ✅ **Only supported option**

**Planned for Future Releases:**

- **`"openai"`** - OpenAI GPT models 🔮
- **`"local"`** - Local models 🔮

**Examples:**

```json
{
  "llmProvider": "anthropic"
}
```

**Note:** v1.0 only supports Anthropic Claude. You must have an `ANTHROPIC_API_KEY` environment variable set.

---

### llmModel

**Type:** `string`  
**Required:** No  
**Default:** `"claude-sonnet-4-5-20250929"`

Specific model to use from the selected provider.

**Anthropic Models:**

- **`"claude-sonnet-4-5-20250929"`** - Claude Sonnet 4.5 (recommended)
  - Best model for complex agents and coding
  - Exceptional for documentation tasks
  
- **`"claude-sonnet-4-20250514"`** - Claude Sonnet 4
  - High-performance model
  - Good balance of quality and speed
  
- **`"claude-3-7-sonnet-20250219"`** - Claude Sonnet 3.7
  - Previous generation model
  - Still very capable
  
- **`"claude-opus-4-1-20250805"`** - Claude Opus 4.1
  - Exceptional for specialized complex tasks
  - Highest quality but more expensive ($15/MTok vs $3/MTok)

**Examples:**

```json
{
  "llmModel": "claude-sonnet-4-5-20250929"  // Recommended
}
```

```json
{
  "llmModel": "claude-opus-4-1-20250805"  // Highest quality
}
```

**Choosing a Model:**

| Model | Quality | Speed | Cost | Use For |
|-------|---------|-------|------|---------|
| Claude Sonnet 4.5 | Exceptional | Fast | $3/MTok | Most projects (recommended) |
| Claude Sonnet 4 | Excellent | Fast | $3/MTok | High-performance needs |
| Claude Opus 4.1 | Best | Moderate | $15/MTok | Complex docs, critical projects |
| Claude Sonnet 3.7 | Very Good | Fast | $3/MTok | Previous generation |

---

### temperature

**Type:** `number` (0-2)  
**Required:** No  
**Default:** `0.3`

Controls the randomness/creativity of AI-generated content.

**Temperature Guide:**

- **0.0-0.3** - Focused and deterministic
  - More consistent output
  - Recommended for documentation
  - Less creative but more accurate
  
- **0.4-0.7** - Balanced
  - Mix of consistency and creativity
  - Good for varied documentation styles
  
- **0.8-2.0** - Creative and varied
  - More diverse output
  - Less consistent
  - Not recommended for technical docs

**Examples:**

```json
{
  "temperature": 0.1  // Very focused, consistent
}
```

```json
{
  "temperature": 0.3  // Recommended for docs
}
```

```json
{
  "temperature": 0.7  // More creative
}
```

**Recommendations:**

| Project Type | Temperature | Reason |
|--------------|-------------|--------|
| API Documentation | 0.1-0.2 | Need precision and consistency |
| User Guides | 0.3-0.4 | Balance clarity and readability |
| Examples | 0.4-0.5 | Some creativity helpful |
| Marketing Docs | 0.6-0.8 | More engaging language |

---

### documentationFormat

**Type:** `"markdown"`  
**Required:** No  
**Default:** `"markdown"`

Format of your documentation files.

**Supported Formats in v1.0:**

- **`"markdown"`** - Standard Markdown (.md) ✅ **Only supported option**

**Planned for Future Releases:**

- **`"mdx"`** - MDX (Markdown with JSX) 🔮

**Examples:**

```json
{
  "documentationFormat": "markdown"
}
```

**Note:** v1.0 only supports standard Markdown (.md) files.

---

### mode

**Type:** `"manual"`  
**Required:** No  
**Default:** `"manual"`

Execution mode for the agent.

**Supported Modes in v1.0:**

- **`"manual"`** - Run manually via CLI ✅ **Only supported option**

**Planned for Future Releases:**

- **`"pre-commit"`** - Run before each commit 🔮
- **`"post-commit"`** - Run after each commit 🔮
- **`"ci"`** - Run in CI/CD pipeline 🔮

**Examples:**

```json
{
  "mode": "manual"
}
```

**Note:** v1.0 only supports manual execution via the CLI. You can still integrate with git hooks or CI manually (see examples in the Usage Guide).

---

## Environment Variables

### ANTHROPIC_API_KEY

**Required:** Yes (when using Anthropic)  
**Type:** String

Your Anthropic API key for accessing Claude models.

**Setting the API Key:**

```bash
# Current session
export ANTHROPIC_API_KEY=your-api-key-here

# Permanent (add to ~/.bashrc or ~/.zshrc)
echo 'export ANTHROPIC_API_KEY=your-api-key-here' >> ~/.zshrc
```

---

## CLI Options

CLI options override configuration file settings.

### --config

Specify a custom configuration file path.

```bash
node dist/cli.js run --config custom-config.json
```

### --files

Analyze specific files instead of git changes.

```bash
node dist/cli.js run --files src/api.ts src/utils.ts
```

### --commit

Analyze changes from a specific commit.

```bash
node dist/cli.js run --commit abc123
```

### --yes

Auto-approve all updates without prompting.

```bash
node dist/cli.js run --yes
```

### --verbose

Enable verbose logging.

```bash
node dist/cli.js run --verbose
```

### --debug

Enable debug mode with detailed output.

```bash
node dist/cli.js run --debug
```

---

## Configuration Examples

### Minimal Configuration

```json
{
  "documentationPaths": ["docs/**/*.md"],
  "codePaths": ["src/**/*.ts"]
}
```

### Strict Configuration

For projects requiring high-quality documentation:

```json
{
  "documentationPaths": [
    "docs/**/*.md",
    "README.md",
    "CHANGELOG.md"
  ],
  "codePaths": ["src/**/*.ts"],
  "ignorePaths": [
    "node_modules/**",
    "dist/**",
    "**/*.test.ts",
    "**/__tests__/**"
  ],
  "minSeverity": "minor",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.1
}
```

### Relaxed Configuration

For internal projects or rapid development:

```json
{
  "documentationPaths": ["README.md"],
  "codePaths": ["src/**/*.ts"],
  "minSeverity": "major",
  "llmModel": "claude-sonnet-4-5-20250929",
  "temperature": 0.5
}
```

### Monorepo Configuration

For projects with multiple packages:

```json
{
  "documentationPaths": [
    "packages/*/docs/**/*.md",
    "packages/*/README.md",
    "docs/**/*.md"
  ],
  "codePaths": [
    "packages/*/src/**/*.ts"
  ],
  "ignorePaths": [
    "node_modules/**",
    "packages/*/dist/**",
    "**/*.test.ts"
  ],
  "minSeverity": "minor"
}
```

---

## Validation

The agent validates your configuration on startup. Common validation errors:

### Missing Required Fields

```
Error: Configuration must include 'documentationPaths' and 'codePaths'
```

**Fix:** Add the required fields to your config file.

### Invalid Severity

```
Error: minSeverity must be one of: breaking, major, minor, patch
```

**Fix:** Use a valid severity level.

### Invalid Temperature

```
Error: temperature must be between 0 and 2
```

**Fix:** Set temperature to a value between 0 and 2.

---

## Best Practices

1. **Start with defaults** - Use `doc-agent init` to create a baseline
2. **Be specific with paths** - Avoid overly broad glob patterns
3. **Ignore test files** - Reduce noise by excluding tests
4. **Use appropriate severity** - `"minor"` works well for most projects
5. **Keep temperature low** - 0.1-0.3 for technical documentation
6. **Version control config** - Commit `.doc-agent.config.json` to git
7. **Document customizations** - Add comments explaining non-standard settings

---

## Next Steps

- Read the [Usage Guide](USAGE.md) for practical examples
- Check [Examples](EXAMPLES.md) for real-world configurations
- Review [Troubleshooting](TROUBLESHOOTING.md) for common issues
