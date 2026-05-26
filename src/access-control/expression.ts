import type { TreeNodeSnapshot, User } from "../types";

export interface ExpressionContext {
  user: User;
  node: TreeNodeSnapshot;
  field?: string;
  value?: unknown;
}

type TokenType =
  | "identifier"
  | "string"
  | "number"
  | "operator"
  | "paren"
  | "bracket"
  | "comma"
  | "boolean"
  | "eof";

interface Token {
  type: TokenType;
  value: string;
}

export function evaluateExpression(expression: string, context: ExpressionContext): boolean {
  const parser = new Parser(tokenize(expression), context);
  const value = parser.parseExpression();
  parser.expect("eof");
  return Boolean(value);
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    const two = expression.slice(index, index + 2);
    if ([">=", "<=", "==", "!="].includes(two)) {
      tokens.push({ type: "operator", value: two });
      index += 2;
      continue;
    }

    if ([">", "<"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === "[" || char === "]") {
      tokens.push({ type: "bracket", value: char });
      index += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      index += 1;
      continue;
    }

    if (char === "'") {
      const end = expression.indexOf("'", index + 1);
      if (end === -1) {
        throw new Error(`Unterminated string in expression: ${expression}`);
      }
      tokens.push({ type: "string", value: expression.slice(index + 1, end) });
      index = end + 1;
      continue;
    }

    if (/\d/.test(char)) {
      let end = index + 1;
      while (end < expression.length && /[\d.]/.test(expression[end])) {
        end += 1;
      }
      tokens.push({ type: "number", value: expression.slice(index, end) });
      index = end;
      continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let end = index + 1;
      while (end < expression.length && /[a-zA-Z0-9_.-]/.test(expression[end])) {
        end += 1;
      }
      const value = expression.slice(index, end);
      tokens.push({
        type: value === "true" || value === "false" ? "boolean" : "identifier",
        value
      });
      index = end;
      continue;
    }

    throw new Error(`Unsupported character "${char}" in expression: ${expression}`);
  }

  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private position = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly context: ExpressionContext
  ) {}

  parseExpression(): unknown {
    return this.parseOr();
  }

  expect(type: TokenType, value?: string): Token {
    const token = this.peek();
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` ${value}` : ""}, got ${token.type} ${token.value}`);
    }
    this.position += 1;
    return token;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.matchIdentifier("or")) {
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseNot();
    while (this.matchIdentifier("and")) {
      const right = this.parseNot();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  private parseNot(): unknown {
    if (this.matchIdentifier("not")) {
      return !Boolean(this.parseNot());
    }
    return this.parseComparison();
  }

  private parseComparison(): unknown {
    let left = this.parsePrimary();
    const token = this.peek();

    if (token.type === "identifier" && token.value === "in") {
      this.position += 1;
      const right = this.parsePrimary();
      return Array.isArray(right) && right.includes(left);
    }

    if (token.type !== "operator") {
      return left;
    }

    this.position += 1;
    const right = this.parsePrimary();

    switch (token.value) {
      case "==":
        return left === right;
      case "!=":
        return left !== right;
      case ">":
        return toNumber(left) > toNumber(right);
      case ">=":
        return toNumber(left) >= toNumber(right);
      case "<":
        return toNumber(left) < toNumber(right);
      case "<=":
        return toNumber(left) <= toNumber(right);
      default:
        throw new Error(`Unsupported operator: ${token.value}`);
    }
  }

  private parsePrimary(): unknown {
    const token = this.peek();

    if (token.type === "string") {
      this.position += 1;
      return token.value;
    }

    if (token.type === "number") {
      this.position += 1;
      return Number(token.value);
    }

    if (token.type === "boolean") {
      this.position += 1;
      return token.value === "true";
    }

    if (token.type === "bracket" && token.value === "[") {
      return this.parseArray();
    }

    if (token.type === "paren" && token.value === "(") {
      this.position += 1;
      const value = this.parseExpression();
      this.expect("paren", ")");
      return value;
    }

    if (token.type === "identifier") {
      return this.parseIdentifier();
    }

    throw new Error(`Unexpected token: ${token.type} ${token.value}`);
  }

  private parseArray(): unknown[] {
    const values: unknown[] = [];
    this.expect("bracket", "[");

    if (this.peek().type === "bracket" && this.peek().value === "]") {
      this.position += 1;
      return values;
    }

    while (true) {
      values.push(this.parseExpression());
      if (this.peek().type === "comma") {
        this.position += 1;
        continue;
      }
      break;
    }

    this.expect("bracket", "]");
    return values;
  }

  private parseIdentifier(): unknown {
    const name = this.expect("identifier").value;

    if (this.peek().type === "paren" && this.peek().value === "(") {
      return this.parseFunctionCall(name);
    }

    return resolvePath(name, this.context);
  }

  private parseFunctionCall(name: string): unknown {
    const args: unknown[] = [];
    this.expect("paren", "(");

    if (this.peek().type === "paren" && this.peek().value === ")") {
      this.position += 1;
      return callFunction(name, args);
    }

    while (true) {
      args.push(this.parseExpression());
      if (this.peek().type === "comma") {
        this.position += 1;
        continue;
      }
      break;
    }

    this.expect("paren", ")");
    return callFunction(name, args);
  }

  private matchIdentifier(value: string): boolean {
    const token = this.peek();
    if (token.type === "identifier" && token.value === value) {
      this.position += 1;
      return true;
    }
    return false;
  }

  private peek(): Token {
    return this.tokens[this.position];
  }
}

function resolvePath(path: string, context: ExpressionContext): unknown {
  if (path === "field") {
    return context.field;
  }

  if (path === "value") {
    return context.value;
  }

  const [root, ...segments] = path.split(".");
  let current: unknown;

  if (root === "user") {
    current = context.user;
  } else if (root === "node") {
    current = context.node;
  } else {
    throw new Error(`Unknown root in expression path: ${root}`);
  }

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function callFunction(name: string, args: unknown[]): unknown {
  if (name === "includes") {
    const [collection, value] = args;
    return Array.isArray(collection) && collection.includes(value);
  }

  if (name === "startsWith") {
    const [value, prefix] = args;
    return typeof value === "string" && typeof prefix === "string" && value.startsWith(prefix);
  }

  throw new Error(`Unsupported function in policy expression: ${name}`);
}

function toNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new Error(`Expected number in comparison, got ${typeof value}`);
  }
  return value;
}
