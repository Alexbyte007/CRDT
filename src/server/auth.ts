import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { User, UserId } from "../types";
import type { CollaborationContext, SessionInfo } from "./types";

const TOKEN_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_KEY_LENGTH = 64;

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function createSession(context: CollaborationContext, userId: UserId): SessionInfo {
  const user = context.users.get(userId);
  if (!user) {
    throw new AuthenticationError("Invalid login user.");
  }

  const session: SessionInfo = {
    token: randomBytes(TOKEN_BYTES).toString("base64url"),
    userId: user.id,
    createdAt: context.now(),
    policyVersion: context.policyVersion
  };
  context.sessions.set(session.token, session);
  return session;
}

export function revokeSession(context: CollaborationContext, token: string): void {
  context.sessions.delete(token);
}

export function authenticateRequest(
  context: CollaborationContext,
  request: IncomingMessage
): User {
  return authenticateToken(context, getBearerToken(request));
}

export function authenticateToken(context: CollaborationContext, token: string | null): User {
  if (!token) {
    throw new AuthenticationError("Missing session token.");
  }

  const session = context.sessions.get(token);
  if (!session) {
    throw new AuthenticationError("Invalid or expired session token.");
  }

  if (session.policyVersion !== context.policyVersion) {
    context.sessions.delete(token);
    throw new AuthenticationError("Session expired because permissions changed.");
  }

  const user = context.users.get(session.userId);
  if (!user) {
    context.sessions.delete(token);
    throw new AuthenticationError("Session user no longer exists.");
  }

  return user;
}

export function requireAdmin(user: User): void {
  if (user.role !== "admin") {
    throw new AuthorizationError("Admin privileges are required.");
  }
}

export function rotatePolicyVersion(context: CollaborationContext): void {
  context.policyVersion += 1;
  for (const session of context.sessions.values()) {
    session.policyVersion = context.policyVersion;
  }
}

export function getBearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match ? match[1] : null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("base64url");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, hash] = storedHash.split("$");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}