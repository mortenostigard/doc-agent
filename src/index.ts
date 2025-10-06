/**
 * Documentation Maintenance Agent
 * Main entry point for programmatic usage
 */

export * from './types/index.js';
export { ConfigManager } from './config/ConfigManager.js';

// Implemented components
export { ChangeDetector } from './detection/ChangeDetector.js';
export { CodeParser } from './parsing/CodeParser.js';
export { DiffAnalyzer } from './diff/DiffAnalyzer.js';
export { DocumentationMapper } from './mapping/DocumentationMapper';
export { ContextBuilder } from './context/ContextBuilder';
export { AIDocumentationGenerator } from './generation/AIDocumentationGenerator';
export { ReviewInterface } from './review/ReviewInterface';
export { AgentController } from './controller/AgentController';
