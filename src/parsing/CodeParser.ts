import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ParsedCode, APIElement, Parameter } from '../types/index.js';

/**
 * CodeParser parses JavaScript/TypeScript code and extracts API information.
 * Uses Babel parser to generate AST and traverse it to find exported APIs.
 */
export class CodeParser {
  private readonly parserOptions: ParserOptions;

  constructor() {
    // Configure Babel parser for TypeScript and modern JavaScript
    this.parserOptions = {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        'decorators-legacy',
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'nullishCoalescingOperator',
        'optionalChaining',
      ],
    };
  }

  /**
   * Parse source code and extract API information
   * @param code Source code to parse
   * @param filePath Optional file path for better error messages
   * @returns ParsedCode object with AST and extracted APIs
   */
  parse(code: string, filePath?: string): ParsedCode {
    try {
      // Parse the code into an AST
      const ast = parse(code, this.parserOptions);

      // Initialize parsed code structure
      const parsedCode: ParsedCode = {
        ast,
        apis: [],
        imports: [],
        exports: [],
      };

      // Traverse the AST to extract information
      traverse(ast, {
        // Extract export statements
        ExportNamedDeclaration: (path) => {
          const { declaration, specifiers } = path.node;

          // Handle export { name1, name2 }
          if (specifiers.length > 0) {
            specifiers.forEach((spec) => {
              if (t.isExportSpecifier(spec)) {
                const exportedName =
                  spec.exported.type === 'Identifier' ? spec.exported.name : spec.exported.value;
                parsedCode.exports.push({
                  name: exportedName,
                  isDefault: false,
                });
              }
            });
          }

          // Handle export function/const/etc
          if (declaration) {
            if (t.isFunctionDeclaration(declaration) && declaration.id) {
              const name = declaration.id.name;
              parsedCode.exports.push({ name, isDefault: false });
              parsedCode.apis.push(this.extractFunctionAPI(declaration, true));
            } else if (t.isClassDeclaration(declaration) && declaration.id) {
              const name = declaration.id.name;
              parsedCode.exports.push({ name, isDefault: false });
              // Pass the export node to check for comments
              parsedCode.apis.push(this.extractClassAPI(declaration, true, path.node));
            } else if (t.isTSInterfaceDeclaration(declaration)) {
              const name = declaration.id.name;
              parsedCode.exports.push({ name, isDefault: false });
              // Pass the export node to check for comments
              parsedCode.apis.push(this.extractInterfaceAPI(declaration, true, path.node));
            } else if (t.isTSTypeAliasDeclaration(declaration)) {
              const name = declaration.id.name;
              parsedCode.exports.push({ name, isDefault: false });
              // Pass the export node to check for comments
              parsedCode.apis.push(this.extractTypeAliasAPI(declaration, true, path.node));
            } else if (t.isVariableDeclaration(declaration)) {
              declaration.declarations.forEach((decl) => {
                if (t.isIdentifier(decl.id)) {
                  const name = decl.id.name;
                  parsedCode.exports.push({ name, isDefault: false });

                  // Check if it's a function expression
                  if (t.isArrowFunctionExpression(decl.init) || t.isFunctionExpression(decl.init)) {
                    parsedCode.apis.push(this.extractFunctionFromVariable(decl, true));
                  } else {
                    // It's a constant
                    parsedCode.apis.push(this.extractConstantAPI(decl, true));
                  }
                }
              });
            }
          }
        },

        // Extract default exports
        ExportDefaultDeclaration: (path) => {
          const { declaration } = path.node;

          if (t.isFunctionDeclaration(declaration) && declaration.id) {
            const name = declaration.id.name;
            parsedCode.exports.push({ name, isDefault: true });
            parsedCode.apis.push(this.extractFunctionAPI(declaration, true));
          } else if (t.isClassDeclaration(declaration)) {
            const name = declaration.id?.name || 'default';
            parsedCode.exports.push({ name, isDefault: true });
            parsedCode.apis.push(this.extractClassAPI(declaration, true));
          } else if (t.isIdentifier(declaration)) {
            parsedCode.exports.push({
              name: declaration.name,
              isDefault: true,
            });
          }
        },

        // Extract import statements
        ImportDeclaration: (path) => {
          const source = path.node.source.value;
          const specifiers: string[] = [];
          let isDefault = false;

          path.node.specifiers.forEach((spec) => {
            if (t.isImportDefaultSpecifier(spec)) {
              specifiers.push(spec.local.name);
              isDefault = true;
            } else if (t.isImportSpecifier(spec)) {
              specifiers.push(spec.local.name);
            } else if (t.isImportNamespaceSpecifier(spec)) {
              specifiers.push(spec.local.name);
            }
          });

          parsedCode.imports.push({ source, specifiers, isDefault });
        },
      });

      return parsedCode;
    } catch (error) {
      if (error instanceof Error) {
        const location = filePath ? ` in ${filePath}` : '';
        throw new Error(`Failed to parse code${location}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse code with custom parser options
   * @param code Source code to parse
   * @param options Custom Babel parser options
   * @returns ParsedCode object
   */
  parseWithOptions(code: string, options: Partial<ParserOptions>): ParsedCode {
    try {
      const mergedOptions = { ...this.parserOptions, ...options };
      const ast = parse(code, mergedOptions);

      const parsedCode: ParsedCode = {
        ast,
        apis: [],
        imports: [],
        exports: [],
      };

      return parsedCode;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse code: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Extract API information from a function declaration
   */
  private extractFunctionAPI(node: t.FunctionDeclaration, isPublic: boolean): APIElement {
    const name = node.id?.name || 'anonymous';
    const params = this.extractParameters(node.params);
    const returnType = this.extractReturnType(node);
    const signature = this.buildFunctionSignature(name, params, returnType);

    return {
      type: 'function',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
      parameters: params,
      returnType,
      documentation: this.extractDocumentation(node),
    };
  }

  /**
   * Extract API information from a variable declaration (arrow function or const)
   */
  private extractFunctionFromVariable(node: t.VariableDeclarator, isPublic: boolean): APIElement {
    const name = t.isIdentifier(node.id) ? node.id.name : 'anonymous';
    const init = node.init;

    let params: Parameter[] = [];
    let returnType: string | undefined;

    if (t.isArrowFunctionExpression(init) || t.isFunctionExpression(init)) {
      params = this.extractParameters(init.params);
      returnType = this.extractReturnType(init);
    }

    const signature = this.buildFunctionSignature(name, params, returnType);

    return {
      type: 'function',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
      parameters: params,
      returnType,
    };
  }

  /**
   * Extract API information from a constant declaration
   */
  private extractConstantAPI(node: t.VariableDeclarator, isPublic: boolean): APIElement {
    const name = t.isIdentifier(node.id) ? node.id.name : 'anonymous';
    const signature = `const ${name}`;

    return {
      type: 'constant',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
    };
  }

  /**
   * Extract parameters from function params
   */
  private extractParameters(
    params: Array<t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty>
  ): Parameter[] {
    return params.map((param) => {
      if (t.isIdentifier(param)) {
        return {
          name: param.name,
          type: this.extractTypeAnnotation(param.typeAnnotation),
          optional: param.optional || false,
        };
      } else if (t.isAssignmentPattern(param)) {
        const name = t.isIdentifier(param.left) ? param.left.name : 'param';
        return {
          name,
          type: this.extractTypeAnnotation(
            t.isIdentifier(param.left) ? param.left.typeAnnotation : undefined
          ),
          optional: true,
          defaultValue: this.extractDefaultValue(param.right),
        };
      } else if (t.isRestElement(param)) {
        const name = t.isIdentifier(param.argument) ? `...${param.argument.name}` : '...rest';
        return {
          name,
          type: this.extractTypeAnnotation(param.typeAnnotation),
          optional: false,
        };
      }

      return {
        name: 'param',
        optional: false,
      };
    });
  }

  /**
   * Extract type annotation from TypeScript type
   */
  private extractTypeAnnotation(
    typeAnnotation: t.TSTypeAnnotation | t.TypeAnnotation | t.Noop | null | undefined
  ): string | undefined {
    if (!typeAnnotation) {
      return undefined;
    }

    // Handle TypeScript type annotations
    if (t.isTSTypeAnnotation(typeAnnotation)) {
      const typeNode = typeAnnotation.typeAnnotation;

      if (t.isTSStringKeyword(typeNode)) return 'string';
      if (t.isTSNumberKeyword(typeNode)) return 'number';
      if (t.isTSBooleanKeyword(typeNode)) return 'boolean';
      if (t.isTSAnyKeyword(typeNode)) return 'any';
      if (t.isTSVoidKeyword(typeNode)) return 'void';
      if (t.isTSTypeReference(typeNode) && t.isIdentifier(typeNode.typeName)) {
        return typeNode.typeName.name;
      }

      return 'unknown';
    }

    // Handle Flow type annotations (for compatibility)
    if (t.isTypeAnnotation(typeAnnotation)) {
      return 'any'; // Simplified handling for Flow types
    }

    return undefined;
  }

  /**
   * Extract return type from function
   */
  private extractReturnType(
    node: t.FunctionDeclaration | t.ArrowFunctionExpression | t.FunctionExpression
  ): string | undefined {
    return this.extractTypeAnnotation(node.returnType);
  }

  /**
   * Extract return type from class method
   */
  private extractMethodReturnType(node: t.ClassMethod): string | undefined {
    return this.extractTypeAnnotation(node.returnType);
  }

  /**
   * Extract default value as string
   */
  private extractDefaultValue(node: t.Expression): string | undefined {
    if (t.isStringLiteral(node)) return `"${node.value}"`;
    if (t.isNumericLiteral(node)) return node.value.toString();
    if (t.isBooleanLiteral(node)) return node.value.toString();
    if (t.isNullLiteral(node)) return 'null';
    if (t.isIdentifier(node) && node.name === 'undefined') return 'undefined';
    return undefined;
  }

  /**
   * Build function signature string
   */
  private buildFunctionSignature(name: string, params: Parameter[], returnType?: string): string {
    const paramStr = params
      .map((p) => {
        let str = p.name;
        if (p.optional) str += '?';
        if (p.type) str += `: ${p.type}`;
        if (p.defaultValue) str += ` = ${p.defaultValue}`;
        return str;
      })
      .join(', ');

    const returnStr = returnType ? `: ${returnType}` : '';
    return `function ${name}(${paramStr})${returnStr}`;
  }

  /**
   * Extract source location from node
   */
  private extractLocation(node: t.Node): {
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
  } {
    return {
      startLine: node.loc?.start.line || 0,
      endLine: node.loc?.end.line || 0,
      startColumn: node.loc?.start.column || 0,
      endColumn: node.loc?.end.column || 0,
    };
  }

  /**
   * Extract JSDoc documentation from leading comments
   */
  private extractDocumentation(node: t.Node): string | undefined {
    if (!node.leadingComments || node.leadingComments.length === 0) {
      return undefined;
    }

    // Find JSDoc comment (starts with /**)
    const jsdocComment = node.leadingComments.find(
      (comment) => comment.type === 'CommentBlock' && comment.value.startsWith('*')
    );

    if (jsdocComment) {
      return jsdocComment.value.trim();
    }

    return undefined;
  }

  /**
   * Extract API information from a class declaration
   */
  private extractClassAPI(
    node: t.ClassDeclaration,
    isPublic: boolean,
    exportNode?: t.Node
  ): APIElement {
    const name = node.id?.name || 'AnonymousClass';
    const methods: string[] = [];

    // Extract class methods
    node.body.body.forEach((member) => {
      if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
        const methodName = member.key.name;
        const params = this.extractParameters(member.params);
        const returnType = this.extractMethodReturnType(member);
        const paramsStr = params
          .map((p) => {
            let str = p.name;
            if (p.optional) str += '?';
            if (p.type) str += `: ${p.type}`;
            return str;
          })
          .join(', ');
        const returnStr = returnType ? `: ${returnType}` : '';
        const methodSignature = `${methodName}(${paramsStr})${returnStr}`;
        methods.push(methodSignature);
      }
    });

    const signature =
      methods.length > 0 ? `class ${name} { ${methods.join('; ')} }` : `class ${name}`;

    // Try to extract documentation from export node first, then from the declaration
    const documentation = exportNode
      ? this.extractDocumentation(exportNode) || this.extractDocumentation(node)
      : this.extractDocumentation(node);

    return {
      type: 'class',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
      documentation,
    };
  }

  /**
   * Extract API information from a TypeScript interface declaration
   */
  private extractInterfaceAPI(
    node: t.TSInterfaceDeclaration,
    isPublic: boolean,
    exportNode?: t.Node
  ): APIElement {
    const name = node.id.name;
    const properties: string[] = [];

    // Extract interface properties
    node.body.body.forEach((member) => {
      if (t.isTSPropertySignature(member) && t.isIdentifier(member.key)) {
        const propName = member.key.name;
        const optional = member.optional ? '?' : '';
        const type = member.typeAnnotation
          ? this.extractTypeAnnotation(member.typeAnnotation)
          : 'any';
        properties.push(`${propName}${optional}: ${type}`);
      } else if (t.isTSMethodSignature(member) && t.isIdentifier(member.key)) {
        const methodName = member.key.name;
        const params = this.extractParameters(member.parameters);
        const returnType = this.extractTypeAnnotation(member.typeAnnotation);
        const paramsStr = params
          .map((p) => {
            let str = p.name;
            if (p.optional) str += '?';
            if (p.type) str += `: ${p.type}`;
            return str;
          })
          .join(', ');
        const returnStr = returnType ? `: ${returnType}` : '';
        const methodSignature = `${methodName}(${paramsStr})${returnStr}`;
        properties.push(methodSignature);
      }
    });

    const signature =
      properties.length > 0
        ? `interface ${name} { ${properties.join('; ')} }`
        : `interface ${name}`;

    // Try to extract documentation from export node first, then from the declaration
    const documentation = exportNode
      ? this.extractDocumentation(exportNode) || this.extractDocumentation(node)
      : this.extractDocumentation(node);

    return {
      type: 'interface',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
      documentation,
    };
  }

  /**
   * Extract API information from a TypeScript type alias declaration
   */
  private extractTypeAliasAPI(
    node: t.TSTypeAliasDeclaration,
    isPublic: boolean,
    exportNode?: t.Node
  ): APIElement {
    const name = node.id.name;
    const typeAnnotation = node.typeAnnotation;

    let typeString = 'unknown';
    if (t.isTSTypeLiteral(typeAnnotation)) {
      const properties: string[] = [];
      typeAnnotation.members.forEach((member) => {
        if (t.isTSPropertySignature(member) && t.isIdentifier(member.key)) {
          const propName = member.key.name;
          const optional = member.optional ? '?' : '';
          const type = member.typeAnnotation
            ? this.extractTypeAnnotation(member.typeAnnotation)
            : 'any';
          properties.push(`${propName}${optional}: ${type}`);
        }
      });
      typeString = properties.length > 0 ? `{ ${properties.join('; ')} }` : '{}';
    } else if (t.isTSUnionType(typeAnnotation)) {
      typeString = 'union type';
    } else if (t.isTSIntersectionType(typeAnnotation)) {
      typeString = 'intersection type';
    } else if (t.isTSTypeReference(typeAnnotation) && t.isIdentifier(typeAnnotation.typeName)) {
      typeString = typeAnnotation.typeName.name;
    }

    const signature = `type ${name} = ${typeString}`;

    // Try to extract documentation from export node first, then from the declaration
    const documentation = exportNode
      ? this.extractDocumentation(exportNode) || this.extractDocumentation(node)
      : this.extractDocumentation(node);

    return {
      type: 'type',
      name,
      signature,
      location: this.extractLocation(node),
      isPublic,
      documentation,
    };
  }
}
