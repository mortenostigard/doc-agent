# Product Overview

doc-agent is an AI-powered documentation maintenance system that automatically keeps documentation synchronized with code changes.

**This is a learning project** focused on understanding agent architecture patterns, hybrid deterministic/AI systems, and practical LLM integration. The goal is to build a working system while prioritizing code clarity and educational value over production optimization.

## Core Functionality

The agent monitors code repositories for API changes, function signature modifications, and structural updates, then intelligently updates relevant documentation to reflect these changes. It combines deterministic code analysis with AI-powered natural language generation.

## Key Features

- Detects code changes via Git commits or file analysis
- Parses TypeScript/JavaScript code to extract API elements
- Maps code changes to affected documentation files
- Generates documentation updates using LLM providers (OpenAI, Anthropic)
- Provides interactive review interface for approving changes
- Supports multiple execution modes: manual CLI, pre-commit hooks, post-commit, and CI integration

## Learning Focus

As a learning project, the codebase prioritizes:
- **Clarity over optimization**: Code is written to be understood, not to be the most performant
- **Simplicity over completeness**: V1 focuses on core concepts, not edge cases
- **Testability over production patterns**: Tests are simple and readable, even if that means simplified implementations
- **Incremental learning**: Each component builds understanding of agent patterns

## Current Status

Version 1.0 is in active development. Core infrastructure is complete, with component implementation in progress.
