import { describe, it, expect } from 'vitest';
import { CodeParser } from './CodeParser.js';

describe('CodeParser - Classes and Interfaces', () => {
  const parser = new CodeParser();

  describe('Class extraction', () => {
    it('should extract exported class with methods', () => {
      const code = `
                export class UserService {
                    getUser(id: string): User {
                        return { id, name: 'test' };
                    }
                    
                    createUser(name: string, email?: string): User {
                        return { id: '1', name };
                    }
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'class',
        name: 'UserService',
        isPublic: true,
      });
      expect(result.apis[0].signature).toContain('getUser');
      expect(result.apis[0].signature).toContain('createUser');
    });

    it('should extract default exported class', () => {
      const code = `
                export default class Calculator {
                    add(a: number, b: number): number {
                        return a + b;
                    }
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'class',
        name: 'Calculator',
        isPublic: true,
      });
      expect(result.exports[0]).toMatchObject({
        name: 'Calculator',
        isDefault: true,
      });
    });

    it('should extract class with no methods', () => {
      const code = `
                export class EmptyClass {}
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'class',
        name: 'EmptyClass',
        isPublic: true,
      });
    });

    it('should extract class with constructor', () => {
      const code = `
                export class Person {
                    constructor(name: string, age: number) {}
                    
                    greet(): string {
                        return 'Hello';
                    }
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].type).toBe('class');
      expect(result.apis[0].signature).toContain('constructor');
      expect(result.apis[0].signature).toContain('greet');
    });
  });

  describe('Interface extraction', () => {
    it('should extract exported interface with properties', () => {
      const code = `
                export interface User {
                    id: string;
                    name: string;
                    email?: string;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'interface',
        name: 'User',
        isPublic: true,
      });
      expect(result.apis[0].signature).toContain('id: string');
      expect(result.apis[0].signature).toContain('name: string');
      expect(result.apis[0].signature).toContain('email?: string');
    });

    it('should extract interface with methods', () => {
      const code = `
                export interface Repository {
                    find(id: string): Promise<User>;
                    save(user: User): Promise<void>;
                    delete(id: string): boolean;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].type).toBe('interface');
      expect(result.apis[0].signature).toContain('find');
      expect(result.apis[0].signature).toContain('save');
      expect(result.apis[0].signature).toContain('delete');
    });

    it('should extract empty interface', () => {
      const code = `
                export interface EmptyInterface {}
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'interface',
        name: 'EmptyInterface',
        isPublic: true,
      });
    });

    it('should extract interface with mixed properties and methods', () => {
      const code = `
                export interface Service {
                    name: string;
                    version: number;
                    start(): void;
                    stop(): Promise<void>;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].signature).toContain('name: string');
      expect(result.apis[0].signature).toContain('version: number');
      expect(result.apis[0].signature).toContain('start()');
      expect(result.apis[0].signature).toContain('stop()');
    });
  });

  describe('Type alias extraction', () => {
    it('should extract type alias with object literal', () => {
      const code = `
                export type Config = {
                    host: string;
                    port: number;
                    debug?: boolean;
                };
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'type',
        name: 'Config',
        isPublic: true,
      });
      expect(result.apis[0].signature).toContain('host: string');
      expect(result.apis[0].signature).toContain('port: number');
      expect(result.apis[0].signature).toContain('debug?: boolean');
    });

    it('should extract union type alias', () => {
      const code = `
                export type Status = 'pending' | 'active' | 'completed';
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'type',
        name: 'Status',
        isPublic: true,
      });
      expect(result.apis[0].signature).toContain('union type');
    });

    it('should extract type reference alias', () => {
      const code = `
                export type UserId = string;
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'type',
        name: 'UserId',
        isPublic: true,
      });
    });

    it('should extract intersection type alias', () => {
      const code = `
                export type Combined = TypeA & TypeB;
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0]).toMatchObject({
        type: 'type',
        name: 'Combined',
        isPublic: true,
      });
      expect(result.apis[0].signature).toContain('intersection type');
    });
  });

  describe('Mixed exports', () => {
    it('should extract multiple types in one file', () => {
      const code = `
                export interface User {
                    id: string;
                    name: string;
                }
                
                export class UserService {
                    getUser(id: string): User {
                        return { id, name: 'test' };
                    }
                }
                
                export type UserId = string;
                
                export function createUser(name: string): User {
                    return { id: '1', name };
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(4);

      const types = result.apis.map((api) => api.type);
      expect(types).toContain('interface');
      expect(types).toContain('class');
      expect(types).toContain('type');
      expect(types).toContain('function');

      const names = result.apis.map((api) => api.name);
      expect(names).toContain('User');
      expect(names).toContain('UserService');
      expect(names).toContain('UserId');
      expect(names).toContain('createUser');
    });

    it('should handle named and default exports together', () => {
      const code = `
                export interface Config {
                    port: number;
                }
                
                export default class App {
                    start(): void {}
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(2);
      expect(result.exports).toHaveLength(2);

      const defaultExport = result.exports.find((e) => e.isDefault);
      expect(defaultExport?.name).toBe('App');

      const namedExport = result.exports.find((e) => !e.isDefault);
      expect(namedExport?.name).toBe('Config');
    });
  });

  describe('Documentation extraction', () => {
    it('should extract JSDoc from class', () => {
      const code = `
                /**
                 * Service for managing users
                 */
                export class UserService {
                    getUser(id: string): User {
                        return { id, name: 'test' };
                    }
                }
            `;

      const result = parser.parse(code);

      expect(result.apis[0].documentation).toBeDefined();
      expect(result.apis[0].documentation).toContain('Service for managing users');
    });

    it('should extract JSDoc from interface', () => {
      const code = `
                /**
                 * Represents a user in the system
                 */
                export interface User {
                    id: string;
                    name: string;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis[0].documentation).toBeDefined();
      expect(result.apis[0].documentation).toContain('Represents a user');
    });

    it('should extract JSDoc from type alias', () => {
      const code = `
                /**
                 * Configuration options
                 */
                export type Config = {
                    port: number;
                };
            `;

      const result = parser.parse(code);

      expect(result.apis[0].documentation).toBeDefined();
      expect(result.apis[0].documentation).toContain('Configuration options');
    });
  });
});
