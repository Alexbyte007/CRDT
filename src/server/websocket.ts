import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { encodeStateVector } from "../crdt/state-vector";
import { getView } from "../view/transform";
import type {
  ChangeInfo,
  ClientMessage,
  CollaborationContext,
  ServerMessage
} from "./types";
import { authenticateToken } from "./auth";
import { requireUser } from "./http";
import { applyUndoRequest, applyRedoRequest, applyViewOperationRequest } from "./operations";
import type { ServerAwarenessManager } from "./awareness";

export interface WebSocketClient {
  socket: WebSocket;
  userId: string;
  undoScopeId: string;
}

export function handleWebSocketConnection(
  socket: WebSocket,
  request: IncomingMessage,
  context: CollaborationContext,
  clients: Set<WebSocketClient>,
  onDocumentChanged: () => void = () => {},
  awarenessManager?: ServerAwarenessManager
): void {
  const url = new URL(request.url ?? "/", "http://localhost");
  const client: WebSocketClient = {
    socket,
    userId: "",
    undoScopeId: ""
  };

  try {
    const token = url.searchParams.get("token");
    const user = authenticateToken(context, token);
    client.userId = user.id;
    client.undoScopeId = token ?? user.id;
    clients.add(client);

    // Register user as online (no focused node yet)
    if (awarenessManager) {
      awarenessManager.update(user.id, user.name, { nodeId: undefined });
    }

    sendServerMessage(socket, {
      type: "view",
      view: getView(context.crdt, user, {
        now: context.now(),
        policyEngine: context.policyEngine
      }),
      stateVector: encodeStateVector(context.crdt),
      policyVersion: context.policyVersion
    });
  } catch (error) {
    sendServerMessage(socket, errorMessage(error));
    socket.close();
    return;
  }

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as ClientMessage;
      handleClientMessage(client, message, context, clients, onDocumentChanged, awarenessManager);
    } catch (error) {
      sendServerMessage(socket, errorMessage(error));
    }
  });

  socket.on("close", () => {
    clients.delete(client);
    if (awarenessManager) {
      awarenessManager.remove(client.userId);
    }
  });
}

export function kickClients(
  clients: Set<WebSocketClient>,
  userIds: string[],
  awarenessManager?: ServerAwarenessManager
): void {
  const ids = new Set(userIds);
  for (const client of clients) {
    if (ids.has(client.userId)) {
      client.socket.close(4001, "Session revoked");
      clients.delete(client);
      if (awarenessManager) {
        awarenessManager.remove(client.userId);
      }
    }
  }
}

export function broadcastViews(
  context: CollaborationContext,
  clients: Set<WebSocketClient>,
  change?: ChangeInfo
): void {
  for (const client of clients) {
    const user = context.users.get(client.userId);
    if (!user || client.socket.readyState !== client.socket.OPEN) {
      continue;
    }

    sendServerMessage(client.socket, {
      type: "view",
      view: getView(context.crdt, user, {
        now: context.now(),
        policyEngine: context.policyEngine
      }),
      stateVector: encodeStateVector(context.crdt),
      policyVersion: context.policyVersion,
      change
    });
  }
}

function handleClientMessage(
  client: WebSocketClient,
  message: ClientMessage,
  context: CollaborationContext,
  clients: Set<WebSocketClient>,
  onDocumentChanged: () => void = () => {},
  awarenessManager?: ServerAwarenessManager
): void {
  if (message.type === "ping") {
    if (awarenessManager) {
      const user = requireUser(context, client.userId);
      awarenessManager.touch(user.id, user.name);
    }
    sendServerMessage(client.socket, { type: "pong" });
    return;
  }

  if (message.type === "awareness") {
    const user = requireUser(context, client.userId);
    if (awarenessManager) {
      awarenessManager.update(user.id, user.name, message.awareness);
    }
    return;
  }

  if (message.type === "operation") {
    const user = requireUser(context, client.userId);
    const envelope = "envelope" in message && message.envelope
      ? {
          ...message.envelope,
          userId: user.id
        }
      : undefined;
    const operation = "operation" in message ? message.operation : (envelope ? envelope.operation : undefined);
    const result = applyViewOperationRequest(context, {
      user,
      operation,
      envelope,
      undoScopeId: client.undoScopeId
    });

    const change: ChangeInfo | undefined = operation ? {
      userId: user.id,
      userName: user.name,
      operationType: operation.type,
      nodeTitle: "title" in operation ? (operation as { title?: string }).title : undefined,
      nodeId: "nodeId" in operation ? (operation as { nodeId?: string }).nodeId
        : "parentId" in operation ? (operation as { parentId?: string }).parentId
        : undefined
    } : undefined;

    sendServerMessage(client.socket, {
      type: "operationApplied",
      view: result.view,
      operationId: result.operationId,
      deduplicated: result.deduplicated,
      stateVector: result.stateVector,
      policyVersion: context.policyVersion,
      change
    });
    if (!result.deduplicated) {
      onDocumentChanged();
      broadcastViews(context, clients, change);
    }
    return;
  }

  if (message.type === "undo") {
    const user = requireUser(context, client.userId);
    try {
      const result = applyUndoRequest(context, user, client.undoScopeId);

      sendServerMessage(client.socket, {
        type: "undoApplied",
        view: result.view,
        stateVector: result.stateVector,
        policyVersion: context.policyVersion,
        undoneEntryId: result.entryId,
        inverseOperationType: result.operationType,
        originalOpType: result.originalOpType,
        nodeId: result.nodeId,
        change: {
          userId: user.id,
          userName: user.name,
          operationType: `undo:${result.originalOpType}`,
          nodeId: result.nodeId
        }
      });
      onDocumentChanged();
      broadcastViews(context, clients, {
        userId: user.id,
        userName: user.name,
        operationType: `undo:${result.originalOpType}`,
        nodeId: result.nodeId
      });
    } catch (error) {
      sendServerMessage(client.socket, errorMessage(error));
    }
    return;
  }

  if (message.type === "redo") {
    const user = requireUser(context, client.userId);
    try {
      const result = applyRedoRequest(context, user, client.undoScopeId);

      sendServerMessage(client.socket, {
        type: "redoApplied",
        view: result.view,
        stateVector: result.stateVector,
        policyVersion: context.policyVersion,
        redoneEntryId: result.entryId,
        redoOperationType: result.operationType,
        originalOpType: result.originalOpType,
        nodeId: result.nodeId,
        change: {
          userId: user.id,
          userName: user.name,
          operationType: `redo:${result.originalOpType}`,
          nodeId: result.nodeId
        }
      });
      onDocumentChanged();
      broadcastViews(context, clients, {
        userId: user.id,
        userName: user.name,
        operationType: `redo:${result.originalOpType}`,
        nodeId: result.nodeId
      });
    } catch (error) {
      sendServerMessage(client.socket, errorMessage(error));
    }
    return;
  }

  if (message.type === "undoStatus") {
    const user = requireUser(context, client.userId);
    sendServerMessage(client.socket, {
      type: "undoStatus",
      canUndo: context.undoManager.canUndo(client.undoScopeId),
      canRedo: context.undoManager.canRedo(client.undoScopeId),
      undoCount: context.undoManager.getUserEntries(client.undoScopeId).length,
      redoCount: context.undoManager.getUserRedoEntries(client.undoScopeId).length
    });
    return;
  }

  throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
}

function sendServerMessage(socket: WebSocket, message: ServerMessage): void {
  socket.send(JSON.stringify(message));
}

function errorMessage(error: unknown): ServerMessage {
  if (error instanceof Error) {
    return {
      type: "error",
      error: {
        name: error.name,
        message: error.message
      }
    };
  }

  return {
    type: "error",
    error: {
      name: "Error",
      message: String(error)
    }
  };
}
