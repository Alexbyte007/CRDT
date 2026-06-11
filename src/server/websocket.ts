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
import { applyViewOperationRequest } from "./operations";

export interface WebSocketClient {
  socket: WebSocket;
  userId: string;
}

export function handleWebSocketConnection(
  socket: WebSocket,
  request: IncomingMessage,
  context: CollaborationContext,
  clients: Set<WebSocketClient>,
  onDocumentChanged: () => void = () => {}
): void {
  const url = new URL(request.url ?? "/", "http://localhost");
  const client: WebSocketClient = {
    socket,
    userId: ""
  };

  try {
    const user = authenticateToken(context, url.searchParams.get("token"));
    client.userId = user.id;
    clients.add(client);

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
      handleClientMessage(client, message, context, clients, onDocumentChanged);
    } catch (error) {
      sendServerMessage(socket, errorMessage(error));
    }
  });

  socket.on("close", () => {
    clients.delete(client);
  });
}

export function kickClients(clients: Set<WebSocketClient>, userIds: string[]): void {
  const ids = new Set(userIds);
  for (const client of clients) {
    if (ids.has(client.userId)) {
      client.socket.close(4001, "Session revoked");
      clients.delete(client);
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
  onDocumentChanged: () => void = () => {}
): void {
  if (message.type === "ping") {
    sendServerMessage(client.socket, { type: "pong" });
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
      envelope
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
