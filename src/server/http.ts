import { encodeStateVector } from "../crdt/state-vector";
import type { User, UserId } from "../types";
import { getView } from "../view/transform";
import {
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
  OperationRequestBody
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
      const body = await readJsonBody<Partial<User>>(request);
      const updated: User = {
        ...target,
        name: typeof body.name === "string" ? body.name : target.name,
        role: isUserRole(body.role) ? body.role : target.role,
        department: typeof body.department === "string" ? body.department : target.department
      };
      context.users.set(target.id, updated);
      rotatePolicyVersion(context);
      onDocumentChanged();
      sendJson(response, 200, {
        ok: true,
        user: publicUser(updated),
        policyVersion: context.policyVersion,
        sessionsInvalidated: true
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
    name: user.name,
    role: user.role,
    department: user.department
  };
}

function isUserRole(value: unknown): value is User["role"] {
  return value === "admin" || value === "manager" || value === "member" || value === "guest";
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
