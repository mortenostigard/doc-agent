# Project Structure

## Directory Organization

```
doc-agent/
├── src/                    # Source code
│   ├── cli.ts             # CLI entry point
│   ├── index.ts           # Main exports
│   ├── types/             # Core type definitions
│   ├── config/            # Configuration management
│   ├── detection/         # Change detection (Git, file system)
│   ├── parsing/           # Code parsing and AST analysis
│   ├── diff/              # API diff analysis
│   ├── mapping/           # Documentation mapping
│   ├── context/           # Context building for AI
│   └── generation/        # AI documentation generation
├── dist/                  # Compiled JavaScript output
├── coverage/              # Test coverage reports
└── node_modules/          # Dependencies
```

## Architecture Patterns

### Module Organization

- Each major component has its own directory under `src/`
- Test files are co-located with implementation: `ComponentName.test.ts`
- Index files (`index.ts`) export public APIs from each module
- Types are centralized in `src/types/index.ts`

### Class-Based Components

Components follow a class-based architecture:
- Single responsibility per class
- Constructor for initialization
- Public methods for primary operations
- Private methods for internal logic
- Comprehensive JSDoc comments

### Type Safety

- Strict TypeScript mode enabled
- Explicit function return types (enforced by ESLint)
- Use `unknown` instead of `any` for type-safe casting
- Comprehensive type definitions in `src/types/`

### Testing

- Vitest for unit tests
- Test files co-located with source: `*.test.ts`
- Coverage tracking enabled
- Tests should not be auto-generated unless explicitly requested
- Tests prioritize clarity and simplicity (this is a learning project)

## Configuration

- `.doc-agent.config.json`: User configuration file
- Default config in `ConfigManager.ts`
- Supports glob patterns for file matching
