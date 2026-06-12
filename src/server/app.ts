import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { defaultPolicyConfig } from "../access-control/default-policy";
import { PolicyEngine } from "../access-control/policy-engine";
import { handleHttpRequest } from "./http";
import type {
  CollaborationContext,
  CollaborationServer,
  CollaborationServerOptions
} from "./types";
import { ServerUndoManager } from "./undo";
import {
  broadcastViews,
  handleWebSocketConnection,
  kickClients,
  type WebSocketClient
} from "./websocket";

export function createCollaborationServer(
  options: CollaborationServerOptions
): CollaborationServer {
  const userAccounts = options.userAccounts ?? [];
  const context: CollaborationContext = {
    crdt: options.crdt,
    users: new Map(options.users.map((user) => [user.id, user])),
    accounts: new Map(userAccounts.map((account) => [account.username.toLowerCase(), account])),
    accountStore: options.documentStore,
    now: options.now ?? Date.now,
    processedOperationIds: new Set(),
    sessions: new Map(),
    policyVersion: 1,
    policyEngine: new PolicyEngine(defaultPolicyConfig),
    undoManager: new ServerUndoManager({ maxDepth: 50 })
  };

  const clients = new Set<WebSocketClient>();
  const persistDocument = () => {
    options.documentStore?.save(context.crdt);
  };
  const httpServer = createServer((request, response) => {
    void handleHttpRequest(request, response, context, () => {
      persistDocument();
      broadcastViews(context, clients);
    }, (revokedUserIds) => {
      kickClients(clients, revokedUserIds);
    });
  });
  const wsServer = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (webSocket) => {
      handleWebSocketConnection(webSocket, request, context, clients, persistDocument);
    });
  });

  httpServer.on("close", () => {
    for (const client of clients) {
      client.socket.close();
    }
    wsServer.close();
  });

  return {
    httpServer,
    wsServer,
    context
  };
}
