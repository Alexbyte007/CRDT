import { encodeStateVector } from "../crdt/state-vector";
import type { User, UserId } from "../types";
import { getView } from "../view/transform";
import {
  AuthorizationError,
  authenticateRequest,
  createSession,
  getBearerToken,
  requireAdmin,
  revokeSession,
  rotatePolicyVersion
} from "./auth";
import type {
  BatchOperationRequestBody,
  CollaborationContext,
  ErrorResponseBody,
  LoginRequestBody,
  OperationRequestBody,
  UpdateUserRequestBody
} from "./types";
import { renderHomePage } from "./page";
import { analyzeDeleteImpact } from "./delete-impact";
import { applyBatchViewOperationRequest, applyViewOperationRequest } from "./operations";

export async function handleHttpRequest(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
  context: CollaborationContext,
  onDocumentChanged: () => void
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && url.pathname === "/") {
      sendHtml(response, 200, renderHomePage());
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/login") {
      const body = await readJsonBody<LoginRequestBody>(request);
      if (!body.userId) {
        throw new Error("Login userId is required.");
      }
      const session = createSession(context, body.userId);
      sendJson(response, 200, {
        ok: true,
        token: session.token,
        user: publicUser(requireUser(context, session.userId)),
        policyVersion: context.policyVersion
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/logout") {
      const token = getBearerToken(request);
      if (token) {
        revokeSession(context, token);
      }
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/users") {
      const user = authenticateRequest(context, request);
      requireAdmin(user);
      sendJson(response, 200, {
        users: Array.from(context.users.values()).map(publicUser),
        policyVersion: context.policyVersion
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/session") {
      const user = authenticateRequest(context, request);
      sendJson(response, 200, {
        ok: true,
        user: publicUser(user),
        policyVersion: context.policyVersion
      });
      return;
    }

    const userRouteMatch = /^\/api\/users\/([^/]+)$/.exec(url.pathname);
    if (request.method === "PATCH" && userRouteMatch) {
      const actor = authenticateRequest(context, request);
      requireAdmin(actor);
      const targetId = decodeURIComponent(userRouteMatch[1]);
      const target = requireUser(context, targetId);
      const body = await readJsonBody<UpdateUserRequestBody>(request);
      const updated = updateUser(context, target, body);
      context.users.set(target.id, updated);
      rotatePolicyVersion(context);
      onDocumentChanged();
      sendJson(response, 200, {
        ok: true,
        user: publicUser(updated),
        policyVersion: context.policyVersion,
        sessionsRefreshed: true
      });
      return;
    }

    if (request.method === "DELETE" && userRouteMatch) {
      const actor = authenticateRequest(context, request);
      requireAdmin(actor);
      const targetId = decodeURIComponent(userRouteMatch[1]);
      const target = requireUser(context, targetId);
      deleteUser(context, actor, target);
      rotatePolicyVersion(context);
      revokeUserSessions(context, target.id);
      onDocumentChanged();
      sendJson(response, 200, {
        ok: true,
        deletedUserId: target.id,
        policyVersion: context.policyVersion
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/view") {
      const user = authenticateRequest(context, request);
      sendJson(response, 200, {
        view: getView(context.crdt, user, {
          now: context.now(),
          policyEngine: context.policyEngine
        }),
        stateVector: encodeStateVector(context.crdt),
        policyVersion: context.policyVersion
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/delete-impact") {
      const user = authenticateRequest(context, request);
      const nodeId = url.searchParams.get("nodeId");
      if (!nodeId) {
        throw new Error("delete impact nodeId is required.");
      }
      const impact = analyzeDeleteImpact(context, user, nodeId);
      sendJson(response, 200, {
        ok: true,
        ...impact
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/operations") {
      const body = await readJsonBody<OperationRequestBody>(request);
      const user = authenticateRequest(context, request);
      const envelope = body.envelope ? { ...body.envelope, userId: user.id } : undefined;
      const result = applyViewOperationRequest(context, {
        user,
        operation: body.operation,
        envelope
      });
      if (!result.deduplicated) {
        onDocumentChanged();
      }
      sendJson(response, 200, {
        ok: true,
        view: result.view,
        operationId: result.operationId,
        deduplicated: result.deduplicated,
        stateVector: result.stateVector
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/operations/batch") {
      const body = await readJsonBody<BatchOperationRequestBody>(request);
      const user = authenticateRequest(context, request);
      const result = applyBatchViewOperationRequest(context, {
        user,
        operations: body.operations?.map((operation) => ({
          ...operation,
          userId: user.id
        }))
      });
      if (result.applied.length > 0) {
        onDocumentChanged();
      }
      sendJson(response, 200, {
        ok: true,
        applied: result.applied,
        skipped: result.skipped,
        rejected: result.rejected,
        view: result.view,
        stateVector: result.stateVector
      });
      return;
    }

    sendJson(response, 404, errorBody(new Error(`Route not found: ${request.method} ${url.pathname}`)));
  } catch (error) {
    sendJson(response, 400, errorBody(error));
  }
}

export function sendHtml(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: string
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(body);
}

export function sendJson(
  response: import("node:http").ServerResponse,
  statusCode: number,
  body: unknown
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

export function requireUser(context: CollaborationContext, userId: string | null | undefined) {
  if (!userId) {
    throw new Error("Missing userId.");
  }

  const user = context.users.get(userId);
  if (!user) {
    throw new Error(`Unknown user: ${userId}`);
  }

  return user;
}

function publicUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    department: user.department,
    createdAt: user.createdAt
  };
}

function updateUser(
  context: CollaborationContext,
  target: User,
  body: UpdateUserRequestBody
): User {
  const role = body.role === undefined ? target.role : parseUserRole(body.role);
  const department =
    typeof body.department === "string"
      ? body.department
      : body.role === undefined
        ? target.department
        : defaultDepartmentForRole(role, target.department);
  if (target.role === "admin" && role !== "admin" && countAdmins(context) <= 1) {
    throw new AuthorizationError("Cannot remove the last administrator.");
  }

  return {
    ...target,
    name: typeof body.name === "string" ? body.name : target.name,
    role,
    department
  };
}

function defaultDepartmentForRole(role: User["role"], currentDepartment: string): string {
  if (role === "member" || role === "manager") {
    return currentDepartment === "external" || currentDepartment === "all" ? "dev" : currentDepartment;
  }
  if (role === "guest") {
    return "external";
  }
  if (role === "admin") {
    return currentDepartment || "all";
  }
  return currentDepartment;
}

function deleteUser(context: CollaborationContext, actor: User, target: User): void {
  if (actor.id === target.id) {
    throw new AuthorizationError("Cannot delete the current administrator.");
  }

  if (target.role === "admin" && countAdmins(context) <= 1) {
    throw new AuthorizationError("Cannot delete the last administrator.");
  }

  context.users.delete(target.id);
}

function revokeUserSessions(context: CollaborationContext, userId: UserId): void {
  for (const [token, session] of context.sessions) {
    if (session.userId === userId) {
      context.sessions.delete(token);
    }
  }
}

function countAdmins(context: CollaborationContext): number {
  return Array.from(context.users.values()).filter((user) => user.role === "admin").length;
}

function parseUserRole(value: unknown): User["role"] {
  if (value === "admin" || value === "manager" || value === "member" || value === "guest") {
    return value;
  }
  throw new Error(`Unsupported user role: ${String(value)}`);
}

function errorBody(error: unknown): ErrorResponseBody {
  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        name: error.name,
        message: error.message
      }
    };
  }

  return {
    ok: false,
    error: {
      name: "Error",
      message: String(error)
    }
  };
}

function readJsonBody<T>(request: import("node:http").IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    request.on("error", reject);

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw.length > 0 ? (JSON.parse(raw) as T) : ({} as T));
      } catch (error) {
        reject(error);
      }
    });
  });
}
