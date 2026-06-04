import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { User, UserId } from "../types";
import type { CollaborationContext, SessionInfo } from "./types";

const TOKEN_BYTES = 32;

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

