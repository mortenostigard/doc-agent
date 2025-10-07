# Contributing to Documentation Maintenance Agent

Thank you for your interest in contributing! This guide will help you set up the project for development.

## Development Setup

### Prerequisites

- **Node.js 18.0.0 or higher** - [Download Node.js](https://nodejs.org/)
- **Git** - For version control
- **Anthropic API Key** - [Get your API key](https://console.anthropic.com/)

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/yourusername/doc-agent.git
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

4. **Set up your API key:**
   ```bash
   export ANTHROPIC_API_KEY=your-api-key-here
   ```

5. **Verify the setup:**
   ```bash
   node dist/cli.js --version
   ```

## Development Workflow

### Building

```bash
# Build once
npm run build

# Watch mode for development
npm run dev
```

### Running Locally

When developing, use the CLI directly from the built files:

```bash
# Run the agent
node dist/cli.js run

# With options
node dist/cli.js run --files src/api.ts --verbose
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check
```

## Project Structure

```
doc-agent/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── index.ts           # Main exports
│   ├── types/             # Type definitions
│   ├── config/            # Configuration management
│   ├── detection/         # Change detection
│   ├── parsing/           # Code parsing
│   ├── diff/              # Diff analysis
│   ├── mapping/           # Documentation mapping
│   ├── context/           # Context building
│   ├── generation/        # AI generation
│   ├── review/            # Review interface
│   ├── controller/        # Pipeline orchestration
│   └── utils/             # Utilities
├── dist/                  # Compiled output (generated)
├── docs/                  # User documentation
├── .kiro/                 # Kiro specs
└── tests/                 # Test files (co-located with source)
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write clear, concise code
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run tests
npm test

# Test the CLI manually
npm run build
node dist/cli.js run --files src/yourfile.ts --verbose
```

### 4. Commit Your Changes

Use conventional commit format:

```bash
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in parser"
git commit -m "docs: update setup guide"
```

**Commit types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Testing Guidelines

### Writing Tests

- Place test files next to the code they test: `ComponentName.test.ts`
- Use descriptive test names
- Test both happy paths and error cases
- Keep tests simple and readable

Example:
```typescript
describe('CodeParser', () => {
  it('should parse a simple function', () => {
    const code = 'function add(a, b) { return a + b; }';
    const result = parser.parse(code, 'javascript');
    expect(result.apis).toHaveLength(1);
    expect(result.apis[0].name).toBe('add');
  });
});
```

### Running Specific Tests

```bash
# Run tests for a specific file
npm test -- CodeParser.test.ts

# Run tests matching a pattern
npm test -- --grep "parse"
```

## Code Style

### TypeScript

- Use strict mode (already configured)
- Provide explicit return types for functions
- Use interfaces for object shapes
- Avoid `any`, use `unknown` instead

### Formatting

- Use Prettier (configured)
- 2 spaces for indentation
- Single quotes for strings
- Trailing commas

### Documentation

- Add JSDoc comments for public APIs
- Include parameter descriptions
- Document return types
- Add examples for complex functions

Example:
```typescript
/**
 * Parse code into an Abstract Syntax Tree
 * @param code - Source code to parse
 * @param language - Programming language (javascript, typescript)
 * @returns Parsed code with API elements
 * @throws {Error} If code cannot be parsed
 */
parse(code: string, language: string): ParsedCode {
  // Implementation
}
```

## Local Testing with npm link

To test the package as if it were installed globally:

```bash
# Build the project
npm run build

# Link it globally
npm link

# Now you can use it like an installed package
doc-agent run

# When done testing
npm unlink -g doc-agent
```

## Debugging

### Enable Debug Mode

```bash
node dist/cli.js run --debug
```

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug CLI",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["run", "--verbose"],
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Common Development Tasks

### Adding a New Component

1. Create the component file in the appropriate directory
2. Create a test file: `ComponentName.test.ts`
3. Export from `src/index.ts` if it's a public API
4. Update type definitions in `src/types/index.ts`
5. Add tests
6. Update documentation

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update package-name

# Update all packages (carefully!)
npm update
```

### Releasing a New Version

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Commit changes
4. Create a git tag
5. Push to GitHub
6. Publish to npm (maintainers only)

## Getting Help

- Check existing issues on GitHub
- Read the [design document](.kiro/specs/documentation-maintenance-agent/design.md)
- Ask questions in pull requests
- Join discussions on GitHub

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the project

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
