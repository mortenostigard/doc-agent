import { describe, it, expect, beforeEach } from 'vitest';
import { CodeParser } from './CodeParser.js';

describe('CodeParser', () => {
  let parser: CodeParser;

  beforeEach(() => {
    parser = new CodeParser();
  });

  describe('parse', () => {
    it('should parse simple JavaScript code', () => {
      const code = `
                function hello() {
                    return 'world';
                }
            `;

      const result = parser.parse(code);

      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
      expect(result.apis).toEqual([]);
      expect(result.imports).toEqual([]);
      expect(result.exports).toEqual([]);
    });

    it('should parse TypeScript code', () => {
      const code = `
                interface User {
                    name: string;
                    age: number;
                }

                function getUser(): User {
                    return { name: 'John', age: 30 };
                }
            `;

      const result = parser.parse(code);

      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('should parse code with JSX', () => {
      const code = `
                function Component() {
                    return <div>Hello</div>;
                }
            `;

      const result = parser.parse(code);

      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('should parse code with modern JavaScript features', () => {
      const code = `
                const value = obj?.property ?? 'default';
                const { data } = await import('./module.js');
            `;

      const result = parser.parse(code);

      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
    });

    it('should throw error for invalid syntax', () => {
      const code = `
                function invalid( {
                    // Missing closing parenthesis
                }
            `;

      expect(() => parser.parse(code)).toThrow('Failed to parse code');
    });

    it('should include file path in error message when provided', () => {
      const code = 'function invalid(';

      expect(() => parser.parse(code, 'test.ts')).toThrow('in test.ts');
    });
  });

  describe('parseWithOptions', () => {
    it('should parse with custom options', () => {
      const code = `
                function test() {
                    return 42;
                }
            `;

      const result = parser.parseWithOptions(code, {
        sourceType: 'script',
      });

      expect(result).toBeDefined();
      expect(result.ast).toBeDefined();
    });
  });

  describe('API extraction', () => {
    it('should extract exported function', () => {
      const code = `
                export function greet(name: string): string {
                    return 'Hello ' + name;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].type).toBe('function');
      expect(result.apis[0].name).toBe('greet');
      expect(result.apis[0].isPublic).toBe(true);
      expect(result.apis[0].parameters).toHaveLength(1);
      expect(result.apis[0].parameters?.[0].name).toBe('name');
      expect(result.apis[0].parameters?.[0].type).toBe('string');
      expect(result.apis[0].returnType).toBe('string');
    });

    it('should extract exported arrow function', () => {
      const code = `
                export const add = (a: number, b: number): number => a + b;
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].type).toBe('function');
      expect(result.apis[0].name).toBe('add');
      expect(result.apis[0].isPublic).toBe(true);
      expect(result.apis[0].parameters).toHaveLength(2);
    });

    it('should extract exported constant', () => {
      const code = `
                export const API_KEY = 'secret';
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].type).toBe('constant');
      expect(result.apis[0].name).toBe('API_KEY');
      expect(result.apis[0].isPublic).toBe(true);
    });

    it('should extract function with optional parameters', () => {
      const code = `
                export function fetch(url: string, options?: object): Promise<any> {
                    return Promise.resolve();
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].parameters).toHaveLength(2);
      expect(result.apis[0].parameters?.[1].optional).toBe(true);
    });

    it('should extract function with default parameters', () => {
      const code = `
                export function greet(name: string = "World"): string {
                    return 'Hello ' + name;
                }
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(1);
      expect(result.apis[0].parameters).toHaveLength(1);
      expect(result.apis[0].parameters?.[0].optional).toBe(true);
      expect(result.apis[0].parameters?.[0].defaultValue).toBe('"World"');
    });

    it('should extract multiple exported functions', () => {
      const code = `
                export function foo() {}
                export function bar() {}
                export const baz = () => {};
            `;

      const result = parser.parse(code);

      expect(result.apis).toHaveLength(3);
      expect(result.apis[0].name).toBe('foo');
      expect(result.apis[1].name).toBe('bar');
      expect(result.apis[2].name).toBe('baz');
    });
  });

  describe('export extraction', () => {
    it('should extract named exports', () => {
      const code = `
                export function test() {}
                export const value = 42;
            `;

      const result = parser.parse(code);

      expect(result.exports).toHaveLength(2);
      expect(result.exports[0].name).toBe('test');
      expect(result.exports[0].isDefault).toBe(false);
      expect(result.exports[1].name).toBe('value');
    });

    it('should extract default export', () => {
      const code = `
                export default function main() {}
            `;

      const result = parser.parse(code);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0].name).toBe('main');
      expect(result.exports[0].isDefault).toBe(true);
    });

    it('should extract export list', () => {
      const code = `
                function foo() {}
                function bar() {}
                export { foo, bar };
            `;

      const result = parser.parse(code);

      expect(result.exports).toHaveLength(2);
      expect(result.exports[0].name).toBe('foo');
      expect(result.exports[1].name).toBe('bar');
    });
  });

  describe('import extraction', () => {
    it('should extract named imports', () => {
      const code = `
                import { foo, bar } from './module';
            `;

      const result = parser.parse(code);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('./module');
      expect(result.imports[0].specifiers).toContain('foo');
      expect(result.imports[0].specifiers).toContain('bar');
      expect(result.imports[0].isDefault).toBe(false);
    });

    it('should extract default import', () => {
      const code = `
                import React from 'react';
            `;

      const result = parser.parse(code);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('react');
      expect(result.imports[0].specifiers).toContain('React');
      expect(result.imports[0].isDefault).toBe(true);
    });

    it('should extract namespace import', () => {
      const code = `
                import * as utils from './utils';
            `;

      const result = parser.parse(code);

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].source).toBe('./utils');
      expect(result.imports[0].specifiers).toContain('utils');
    });
  });
});
