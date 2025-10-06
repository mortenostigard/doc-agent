# Implementation Plan

This plan breaks down the Documentation Maintenance Agent into incremental, testable coding tasks. Each task builds on previous work and focuses on V1 functionality: a manual CLI tool for in-repo documentation updates.

- [x] 1. Set up project structure and core configuration
  - Create Node.js/TypeScript project with proper tooling (tsconfig, eslint, prettier)
  - Set up CLI framework using Commander.js or similar
  - Implement configuration file loading (.doc-agent.config.json)
  - Create core type definitions for all interfaces from design document
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 2. Implement Change Detector for git-based change detection
  - [x] 2.1 Create ChangeDetector class with git integration
    - Use simple-git or isomorphic-git to read git diffs
    - Implement detectFromGit() to get changed files since last commit
    - Filter files based on configuration (codePaths, ignorePaths)
    - Return CodeChange objects with file paths and content
    - _Requirements: 1.1, 1.5, 7.2_
  
  - [x] 2.2 Add file content extraction
    - Read current file content from file system
    - Read previous file content from git history
    - Detect programming language from file extension
    - Handle deleted and added files appropriately
    - _Requirements: 1.1, 1.2_
  
  - [x] 2.3 Write unit tests for ChangeDetector
    - Test git diff parsing with mock git repository
    - Test file filtering based on configuration
    - Test language detection for various file extensions
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. Implement Code Parser for JavaScript/TypeScript
  - [x] 3.1 Create CodeParser class with Babel integration
    - Install and configure @babel/parser for JS/TS
    - Implement parse() method to generate AST
    - Handle parsing errors gracefully with try-catch
    - _Requirements: 5.1, 5.2_
  
  - [x] 3.2 Implement API extraction from AST
    - Traverse AST to find exported functions
    - Extract function names, parameters, and return types
    - Identify public vs private APIs (exported vs not)
    - Create APIElement objects with all metadata
    - _Requirements: 1.1, 5.2_
  
  - [x] 3.3 Add support for classes and interfaces
    - Extract class declarations and methods
    - Extract TypeScript interfaces and type aliases
    - Handle both named and default exports
    - _Requirements: 5.2_
  
  - [x] 3.4 Write unit tests for CodeParser
    - Test parsing various JS/TS code samples
    - Test API extraction for functions, classes, interfaces
    - Test error handling for invalid syntax
    - _Requirements: 5.1, 5.2_

- [x] 4. Implement Diff Analyzer to compare code versions
  - [x] 4.1 Create DiffAnalyzer class
    - Implement analyze() to compare two ParsedCode objects
    - Identify added APIs by comparing new vs old
    - Identify removed APIs by comparing old vs new
    - Identify modified APIs by matching names and comparing signatures
    - _Requirements: 1.2_
  
  - [x] 4.2 Add change classification logic
    - Determine if changes affect public APIs only
    - Calculate change severity (breaking, major, minor, patch)
    - Create detailed ChangeDetail objects for modifications
    - _Requirements: 1.3, 1.4_
  
  - [x] 4.3 Write unit tests for DiffAnalyzer
    - Test with known before/after code pairs
    - Test detection of added, removed, modified APIs
    - Test severity calculation logic
    - _Requirements: 1.2, 1.3_

- [x] 5. Implement Documentation Mapper to find affected docs
  - [x] 5.1 Create DocumentationMapper class
    - Scan configured documentation directories
    - Read all markdown files into memory
    - Build index of documentation files
    - _Requirements: 2.1, 2.2, 6.1_
  
  - [x] 5.2 Implement reference finding logic
    - Search for API element names in documentation text
    - Use regex to find exact name matches
    - Extract surrounding context for each match
    - Create DocReference objects with line numbers
    - _Requirements: 2.1, 2.3_
  
  - [x] 5.3 Add code example detection
    - Parse markdown to find code fences
    - Extract code blocks with language tags
    - Search code examples for API usage
    - _Requirements: 2.4_
  
  - [x] 5.4 Implement mapAffectedDocs() orchestration
    - For each changed API, find all references
    - Group references by documentation file
    - Identify APIs with no documentation (missing docs)
    - Return AffectedDocumentation object
    - _Requirements: 2.5, 2.6_
  
  - [x] 5.5 Write unit tests for DocumentationMapper
    - Test with mock documentation files
    - Test reference finding for various patterns
    - Test code example extraction
    - _Requirements: 2.1, 2.3, 2.4_

- [x] 6. Implement Context Builder for LLM prompts
  - [x] 6.1 Create ContextBuilder class
    - Implement buildContext() to aggregate all information
    - Include code changes (APIDiff)
    - Include affected documentation files
    - Include project context (language, format)
    - _Requirements: 3.5_
  
  - [x] 6.2 Add style guide extraction
    - Analyze existing documentation tone and structure
    - Extract common formatting patterns
    - Identify documentation conventions used
    - Create StyleGuide object
    - _Requirements: 3.1, 6.4_
  
  - [x] 6.3 Write unit tests for ContextBuilder
    - Test context aggregation with mock data
    - Test style guide extraction from sample docs
    - _Requirements: 3.1, 3.5_

- [x] 7. Implement AI Documentation Generator with LLM integration
  - [x] 7.1 Create AIDocumentationGenerator class with Claude/Anthropic integration
    - Install Anthropic SDK (@anthropic-ai/sdk)
    - Implement LLM API client with API key from environment
    - Add error handling and retry logic for API calls
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 7.2 Create prompt templates for documentation updates
    - Design system prompt explaining the task
    - Include code changes in user prompt
    - Include existing documentation for context
    - Include style guide instructions
    - Request structured output (updated content + reasoning)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 7.3 Implement generateUpdate() method
    - Build prompt from DocumentationContext
    - Call LLM API with prompt
    - Parse response to extract updated documentation
    - Create DocumentationUpdate object with changes
    - _Requirements: 3.2, 3.3_
  
  - [x] 7.4 Add validation for generated documentation
    - Check that code examples have valid syntax
    - Verify that API names are correctly updated
    - Ensure markdown structure is preserved
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.5 Write unit tests for AIDocumentationGenerator
    - Test with mocked LLM responses
    - Test prompt generation from context
    - Test response parsing and validation
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. Implement Review Interface for user approval
  - [x] 8.1 Create ReviewInterface class for CLI
    - Implement presentUpdate() to display diffs
    - Use a diff library (diff or jsdiff) to show changes
    - Format output with colors for readability
    - _Requirements: 4.1, 4.2_
  
  - [x] 8.2 Add interactive prompts for user decisions
    - Use inquirer or prompts library for CLI interaction
    - Present approve/reject/edit options
    - Handle edit action by opening editor or accepting inline input
    - Return ReviewDecision object
    - _Requirements: 4.3_
  
  - [x] 8.3 Implement decision logging
    - Log approved/rejected decisions to file
    - Include reasoning and feedback
    - Structure for potential future learning
    - _Requirements: 4.4, 4.6_
  
  - [x] 8.4 Write unit tests for ReviewInterface
    - Test diff formatting with sample updates
    - Test with mocked user input
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Implement Agent Controller to orchestrate pipeline
  - [x] 9.1 Create AgentController class
    - Implement run() method as main entry point
    - Initialize all component instances
    - Manage pipeline state throughout execution
    - _Requirements: 7.3, 7.5_
  
  - [x] 9.2 Implement pipeline orchestration
    - Call ChangeDetector to get code changes
    - Call CodeParser to parse old and new code
    - Call DiffAnalyzer to identify API changes
    - Call DocumentationMapper to find affected docs
    - Call ContextBuilder to prepare LLM context
    - Call AIDocumentationGenerator for each affected doc
    - Call ReviewInterface for each generated update
    - Apply approved changes to file system
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 4.5_
  
  - [x] 9.3 Add error handling and recovery
    - Wrap each pipeline stage in try-catch
    - Log errors with context
    - Continue processing other files on individual failures
    - Return AgentResult with summary and errors
    - _Requirements: 5.5_
  
  - [x] 9.4 Implement file writing for approved updates
    - Write updated documentation to file system
    - Create backup of original files
    - Handle file write errors gracefully
    - _Requirements: 4.5_
  
  - [-] 9.5 Write integration tests for AgentController
    - Test full pipeline with sample repository
    - Test error handling at each stage
    - Test with mocked components
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 10. Implement CLI interface and commands
  - [ ] 10.1 Create main CLI entry point
    - Set up Commander.js with main command structure
    - Implement `doc-agent run` command
    - Add --files option for specific file analysis
    - Add --commit option for specific commit analysis
    - Parse command line arguments
    - _Requirements: 7.3, 7.5_
  
  - [ ] 10.2 Add configuration loading and validation
    - Load .doc-agent.config.json from current directory
    - Provide sensible defaults for missing config
    - Validate configuration structure
    - Show helpful error messages for invalid config
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 10.3 Wire up CLI to AgentController
    - Create AgentInput from CLI arguments and config
    - Call AgentController.run() with input
    - Display progress and status messages
    - Show final summary of results
    - _Requirements: 7.3, 7.5_
  
  - [ ] 10.4 Add help text and documentation
    - Write clear help text for all commands
    - Add examples to help output
    - Create README with usage instructions
    - _Requirements: 7.3_

- [ ] 11. Create end-to-end test scenario
  - [ ] 11.1 Set up test repository
    - Create sample TypeScript project
    - Add sample functions and classes
    - Create sample documentation in /docs folder
    - Commit initial state to git
    - _Requirements: All_
  
  - [ ] 11.2 Create test scenario with code changes
    - Modify function signature in code
    - Run doc-agent on changes
    - Verify documentation updates are generated
    - Verify updates are accurate and preserve style
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2_
  
  - [ ]* 11.3 Test additional scenarios
    - Test with breaking changes
    - Test with missing documentation
    - Test with multiple affected files
    - _Requirements: 2.6, 3.6_

- [ ] 12. Polish and finalize V1
  - [ ] 12.1 Add logging and debugging support
    - Implement structured logging throughout
    - Add --verbose flag for detailed output
    - Add --debug flag for troubleshooting
    - _Requirements: All_
  
  - [ ] 12.2 Optimize performance
    - Add caching for parsed ASTs
    - Implement parallel processing where possible
    - Measure and log performance metrics
    - _Requirements: All_
  
  - [ ] 12.3 Create user documentation
    - Write comprehensive README
    - Add setup and installation instructions
    - Document configuration options
    - Provide usage examples
    - _Requirements: 6.1, 6.2, 6.3, 7.3_
  
  - [ ] 12.4 Package for distribution
    - Configure package.json for npm publishing
    - Add bin entry for CLI command
    - Test installation from npm
    - _Requirements: 7.3_
