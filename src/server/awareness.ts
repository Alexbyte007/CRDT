import { WebSocket } from "ws";
import { getNodeSnapshot } from "../crdt/snapshot";
import type {
  AwarenessUserState,
  ClientAwarenessState,
  CollaborationContext
} from "./types";
import type { WebSocketClient } from "./websocket";

const AWARENESS_COLORS = [
  "#4f46e5", "#06b6d4", "#7c3aed", "#16a34a",
  "#d97706", "#dc2626", "#0891b2", "#9333ea"
];

const STALE_TIMEOUT_MS = 60_000; // Remove states not updated in 60s

function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  return AWARENESS_COLORS[Math.abs(hash) % AWARENESS_COLORS.length];
}

/**
 * Check whether viewerUserId can see the given node.
 * Uses O(1) policy-engine lookup instead of rebuilding the entire view tree.
 */
function canUserSeeNode(
  viewerUserId: string,
  nodeId: string,
  context: CollaborationContext
): boolean {
  const user = context.users.get(viewerUserId);
  if (!user) return false;

  const snapshot = getNodeSnapshot(context.crdt, nodeId);
  if (!snapshot) return false;

  return context.policyEngine.canViewNode(user, snapshot);
}

export class ServerAwarenessManager {
  private states = new Map<string, AwarenessUserState>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private clients: Set<WebSocketClient> | null = null;
  private context: CollaborationContext | null = null;
  private _broadcastScheduled = false;

  setup(
    clients: Set<WebSocketClient>,
    context: CollaborationContext
  ): void {
    this.clients = clients;
    this.context = context;
  }

  update(
    userId: string,
    userName: string,
    awareness?: ClientAwarenessState
  ): void {
    const existing = this.states.get(userId);

    // Server-side validation: if the client claims to be editing a node,
    // verify they actually have permission to edit its content.
    let validatedNodeId = awareness?.nodeId ?? existing?.nodeId ?? undefined;
    if (validatedNodeId && this.context) {
      const snapshot = getNodeSnapshot(this.context.crdt, validatedNodeId);
      if (snapshot) {
        const user = this.context.users.get(userId);
        if (!user || !this.context.policyEngine.canEditNode(user, snapshot, "updateContent")) {
          // User cannot edit this node — silently strip the nodeId
          validatedNodeId = undefined;
        }
      } else {
        // Node doesn't exist — strip the nodeId
        validatedNodeId = undefined;
      }
    }

    this.states.set(userId, {
      userId,
      userName,
      color: existing?.color ?? userColor(userId),
      nodeId: validatedNodeId,
      lastSeen: Date.now()
    });
    this.broadcast();
  }

  touch(userId: string, userName: string): void {
    const existing = this.states.get(userId);
    this.states.set(userId, {
      userId,
      userName,
      color: existing?.color ?? userColor(userId),
      nodeId: existing?.nodeId,
      lastSeen: Date.now()
    });
    this.broadcast();
  }

  remove(userId: string): void {
    const existed = this.states.delete(userId);
    // Only broadcast if the user actually existed in the map
    if (existed) {
      this.broadcast();
    }
  }

  getAllStates(): AwarenessUserState[] {
    this._reapStale();
    return Array.from(this.states.values());
  }

  private getVisibleStates(
    viewerUserId: string
  ): AwarenessUserState[] {
    const context = this.context;
    if (!context) return [];

    const states: AwarenessUserState[] = [];
    for (const state of this.states.values()) {
      if (state.userId === viewerUserId) continue;

      const visibleState: AwarenessUserState = { ...state };
      if (state.nodeId && !canUserSeeNode(viewerUserId, state.nodeId, context)) {
        visibleState.nodeId = undefined;
      }
      states.push(visibleState);
    }
    return states;
  }

  private broadcast(): void {
    const clients = this.clients;
    const context = this.context;
    if (!clients || !context) return;

    // Use setImmediate to batch rapid updates
    if (this._broadcastScheduled) return;
    this._broadcastScheduled = true;
    setImmediate(() => {
      this._broadcastScheduled = false;
      this._doBroadcast();
    });
  }

  private _doBroadcast(): void {
    const clients = this.clients;
    const context = this.context;
    if (!clients || !context) return;

    // Reap stale states (disconnected users, browser crashes, network partitions)
    this._reapStale();

    for (const client of clients) {
      try {
        if (client.socket.readyState !== WebSocket.OPEN) continue;
        const visibleStates = this.getVisibleStates(client.userId);
        client.socket.send(JSON.stringify({
          type: "awareness",
          states: visibleStates
        }));
      } catch {
        // Skip this client — don't let one bad socket break the broadcast
      }
    }
  }

  private _reapStale(): void {
    const now = Date.now();
    for (const [userId, state] of this.states) {
      if (now - state.lastSeen > STALE_TIMEOUT_MS) {
        this.states.delete(userId);
      }
    }
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      this._doBroadcast();
    }, 30_000); // Periodic heartbeat every 30s (also reaps stale states)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
