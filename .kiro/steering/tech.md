# Technology Stack

## Language & Runtime

- TypeScript 5.3+ (strict mode enabled)
- Node.js 18.0.0+ required
- Target: ES2022
- Module system: CommonJS

## Core Dependencies

- **@babel/parser** & **@babel/traverse**: AST parsing for code analysis
- **@anthropic-ai/sdk**: AI integration for documentation generation
- **commander**: CLI framework
- **simple-git**: Git operations and change detection

## Development Tools

- **Vitest**: Testing framework with coverage via v8
- **ESLint**: Linting with TypeScript rules
- **Prettier**: Code formatting
- **TypeScript Compiler**: Build system

## Common Commands

```bash
# Build
npm run build              # Compile TypeScript to dist/

# Development
npm run dev                # Watch mode compilation

# Testing
npm run test               # Run tests once
npm run test:watch         # Run tests in watch mode

# Code Quality
npm run lint               # Lint TypeScript files
npm run format             # Format code with Prettier
npm run format:check       # Check formatting without changes

# CLI Usage (after build)
node dist/cli.js init      # Create config file
node dist/cli.js run       # Run the agent
```

## Build Output

- Source: `src/`
- Compiled: `dist/`
- Includes declaration files (.d.ts) and source maps
