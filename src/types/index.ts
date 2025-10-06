/**
 * Core type definitions for the Documentation Maintenance Agent
 * Based on the design document interfaces
 */

// ============================================================================
// Configuration Types
// ============================================================================

export type ChangeSeverity = 'breaking' | 'major' | 'minor' | 'patch';
export type LLMProvider = 'openai' | 'anthropic' | 'local';
export type DocumentationFormat = 'markdown' | 'mdx';
export type ExecutionMode = 'manual' | 'pre-commit' | 'post-commit' | 'ci';

export interface AgentConfig {
  // Paths
  documentationPaths: string[];
  codePaths: string[];
  ignorePaths: string[];

  // Behavior
  minSeverity: ChangeSeverity;
  generateMissingDocs: boolean;

  // AI Settings
  llmProvider: LLMProvider;
  llmModel: string;
  temperature: number;

  // Style
  customStyleGuide?: string;
  documentationFormat: DocumentationFormat;

  // Execution
  mode: ExecutionMode;
}

// ============================================================================
// Change Detection Types
// ============================================================================

export type ChangeType = 'added' | 'modified' | 'deleted';

export interface CodeChange {
  filePath: string;
  changeType: ChangeType;
  language: string;
  content: string;
  previousContent?: string;
}

// ============================================================================
// Code Parsing Types
// ============================================================================

export type APIElementType = 'function' | 'class' | 'interface' | 'type' | 'constant';

export interface SourceLocation {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

export interface Parameter {
  name: string;
  type?: string;
  optional: boolean;
  defaultValue?: string;
}

export interface APIElement {
  type: APIElementType;
  name: string;
  signature: string;
  location: SourceLocation;
  isPublic: boolean;
  documentation?: string;
  parameters?: Parameter[];
  returnType?: string;
}

export interface ImportStatement {
  source: string;
  specifiers: string[];
  isDefault: boolean;
}

export interface ExportStatement {
  name: string;
  isDefault: boolean;
}

export interface ParsedCode {
  ast: unknown; // Babel AST - use unknown for type safety, cast when needed
  apis: APIElement[];
  imports: ImportStatement[];
  exports: ExportStatement[];
}

// ============================================================================
// Diff Analysis Types
// ============================================================================

export type ChangeDetailType = 'signature' | 'parameters' | 'return_type' | 'documentation';

export interface ChangeDetail {
  type: ChangeDetailType;
  description: string;
}

export interface ModifiedAPI {
  old: APIElement;
  new: APIElement;
  changes: ChangeDetail[];
}

export interface APIDiff {
  added: APIElement[];
  removed: APIElement[];
  modified: ModifiedAPI[];
  unchanged: APIElement[];
}

// ============================================================================
// Documentation Mapping Types
// ============================================================================

export type ReferenceType = 'name' | 'example' | 'description';

export interface DocReference {
  filePath: string;
  lineNumber: number;
  context: string;
  referenceType: ReferenceType;
}

export interface CodeExample {
  filePath: string;
  code: string;
  language: string;
  startLine: number;
  endLine: number;
}

export interface DocFile {
  path: string;
  content: string;
  references: DocReference[];
  examples: CodeExample[];
}

export interface AffectedDocumentation {
  files: Map<string, DocFile>;
  totalReferences: number;
  missingDocs: APIElement[];
}

// ============================================================================
// Context Building Types
// ============================================================================

export interface StyleGuide {
  tone: string;
  formatting: string;
  conventions: string[];
  examplePatterns: string[];
}

export interface ProjectContext {
  language: string;
  framework?: string;
  documentationFormat: string;
  customGuidelines?: string;
}

export interface DocumentationContext {
  codeChanges: APIDiff;
  affectedFiles: DocFile[];
  styleGuide: StyleGuide;
  projectContext: ProjectContext;
  examples: CodeExample[];
}

// ============================================================================
// AI Generation Types
// ============================================================================

export type ContentChangeType = 'example' | 'description' | 'signature' | 'addition';

export interface ContentChange {
  type: ContentChangeType;
  startLine: number;
  endLine: number;
  oldContent: string;
  newContent: string;
}

export interface DocumentationUpdate {
  filePath: string;
  originalContent: string;
  updatedContent: string;
  changes: ContentChange[];
  reasoning: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Review Types
// ============================================================================

export type ReviewAction = 'approve' | 'reject' | 'edit';

export interface ReviewDecision {
  action: ReviewAction;
  editedContent?: string;
  feedback?: string;
}

// ============================================================================
// Agent Controller Types
// ============================================================================

export type AgentMode = 'git' | 'files' | 'watch';
export type PipelinePhase = 'detecting' | 'mapping' | 'generating' | 'reviewing' | 'complete';

export interface AgentInput {
  mode: AgentMode;
  target?: string; // commit hash or file paths
  config: AgentConfig;
  autoApprove?: boolean; // Auto-approve all updates without prompting
}

export interface AgentResult {
  success: boolean;
  updatesGenerated: number;
  updatesApplied: number;
  errors: Error[];
  summary: string;
}

export interface AgentState {
  currentPhase: PipelinePhase;
  progress: number;
  pendingReviews: DocumentationUpdate[];
}

export interface PipelineMetrics {
  filesAnalyzed: number;
  apisChanged: number;
  docsUpdated: number;
  executionTime: number;
}

export interface PipelineState {
  sessionId: string;
  startTime: Date;
  input: AgentInput;

  // Phase outputs
  detectedChanges?: CodeChange[];
  parsedCode?: Map<string, ParsedCode>;
  diffs?: APIDiff[];
  affectedDocs?: AffectedDocumentation;
  generatedUpdates?: DocumentationUpdate[];
  reviewDecisions?: ReviewDecision[];

  // Metrics
  metrics: PipelineMetrics;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export type ErrorRecoveryAction = 'retry' | 'skip' | 'fail' | 'fallback';

export interface ErrorContext {
  phase: PipelinePhase;
  component: string;
  operation: string;
  data?: unknown; // Additional context data - use unknown for type safety
}

export interface ErrorRecovery {
  action: ErrorRecoveryAction;
  retryCount?: number;
  fallbackValue?: unknown; // Fallback value - use unknown for type safety
  userMessage: string;
}
