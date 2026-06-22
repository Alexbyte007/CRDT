import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { defaultPolicyConfig } from "../access-control/default-policy";
import { compactTombstones, DEFAULT_TOMBSTONE_RETENTION_MS } from "../crdt/tombstone-gc";
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
import { ServerAwarenessManager } from "./awareness";

const TOMBSTONE_GC_INTERVAL_MS = 60 * 60 * 1000;

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
    undoManager: new ServerUndoManager({ maxDepth: 50 }),
    tombstoneRetentionMs: options.tombstoneRetentionMs ?? DEFAULT_TOMBSTONE_RETENTION_MS
  };

  const clients = new Set<WebSocketClient>();
  const awarenessManager = new ServerAwarenessManager();
  awarenessManager.setup(clients, context);
  awarenessManager.start();

  const runTombstoneGc = () => compactTombstones(context.crdt, {
      now: context.now(),
      retentionMs: context.tombstoneRetentionMs,
      protectedNodeIds: context.undoManager.getProtectedTombstoneIds()
    });

  const persistDocument = () => {
    runTombstoneGc();
    options.documentStore?.save(context.crdt);
  };

  const tombstoneGcInterval = setInterval(() => {
    const result = runTombstoneGc();
    if (result.removed.length > 0) {
      options.documentStore?.save(context.crdt);
    }
  }, TOMBSTONE_GC_INTERVAL_MS);
  tombstoneGcInterval.unref?.();
  const httpServer = createServer((request, response) => {
    void handleHttpRequest(request, response, context, awarenessManager, () => {
      persistDocument();
      broadcastViews(context, clients);
    }, (revokedUserIds) => {
      kickClients(clients, revokedUserIds, awarenessManager);
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
      handleWebSocketConnection(webSocket, request, context, clients, persistDocument, awarenessManager);
    });
  });

  httpServer.on("close", () => {
    clearInterval(tombstoneGcInterval);
    awarenessManager.stop();
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
