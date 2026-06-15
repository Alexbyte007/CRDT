import type {
  FullDocOperation,
  NodeAcl,
  NodeAttrs,
  UserId
} from "../types";
import { getNodeSnapshot } from "../crdt/snapshot";
import { collectSubtreeSnapshots, findIndexInParent } from "../crdt/operations";
import type { CollaborationContext, UndoCapturedState, UndoEntry } from "./types";

export class ServerUndoManager {
  private stacks: Map<UserId, UndoEntry[]>;
  private redoStacks: Map<UserId, UndoEntry[]>;
  private sequenceCounters: Map<UserId, number>;
  private maxDepth: number;

  constructor(options?: { maxDepth?: number }) {
    this.stacks = new Map();
    this.redoStacks = new Map();
    this.sequenceCounters = new Map();
    this.maxDepth = options?.maxDepth ?? 50;
  }

  /** Record a new operation for undo tracking. Called BEFORE applyFullDocOperation. */
  track(
    userId: UserId,
    operation: FullDocOperation,
    context: CollaborationContext
  ): void {
    const capturedState = this.captureState(operation, context);
    const sequenceNumber = this.nextSequenceNumber(userId);

    const entry: UndoEntry = {
      id: `undo-${userId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      actorId: userId,
      timestamp: operation.timestamp ?? context.now(),
      operationType: operation.type,
      originalOp: operation,
      inverseOp: this.computeInverse(userId, capturedState, context),
      capturedState,
      sequenceNumber
    };

    const stack = this.getOrCreateStack(userId);
    stack.push(entry);
    if (stack.length > this.maxDepth) {
      stack.shift();
    }

    // New operation invalidates redo history for this user
    this.clearRedo(userId);
  }

  /** Peek at the top of the undo stack. */
  peekUndo(userId: UserId): UndoEntry | undefined {
    const stack = this.stacks.get(userId);
    if (!stack || stack.length === 0) return undefined;
    return stack[stack.length - 1];
  }

  /** Peek at the top of the redo stack. */
  peekRedo(userId: UserId): UndoEntry | undefined {
    const redoStack = this.redoStacks.get(userId);
    if (!redoStack || redoStack.length === 0) return undefined;
    return redoStack[redoStack.length - 1];
  }

  /** Pop the top entry from the undo stack and push it onto the redo stack. */
  popUndo(userId: UserId): UndoEntry | undefined {
    const stack = this.stacks.get(userId);
    if (!stack || stack.length === 0) return undefined;
    const entry = stack.pop()!;
    const redoStack = this.getOrCreateRedoStack(userId);
    redoStack.push(entry);
    return entry;
  }

  /** Pop the top entry from the redo stack and push it back onto the undo stack. */
  popRedo(userId: UserId): UndoEntry | undefined {
    const redoStack = this.redoStacks.get(userId);
    if (!redoStack || redoStack.length === 0) return undefined;
    const entry = redoStack.pop()!;
    const stack = this.getOrCreateStack(userId);
    stack.push(entry);
    return entry;
  }

  /** Clear the redo stack for a user (called when they perform a new operation). */
  clearRedo(userId: UserId): void {
    this.redoStacks.delete(userId);
  }

  canUndo(userId: UserId): boolean {
    const stack = this.stacks.get(userId);
    return !!(stack && stack.length > 0);
  }

  canRedo(userId: UserId): boolean {
    const redoStack = this.redoStacks.get(userId);
    return !!(redoStack && redoStack.length > 0);
  }

  getUserEntries(userId: UserId): UndoEntry[] {
    return [...(this.stacks.get(userId) ?? [])];
  }

  getUserRedoEntries(userId: UserId): UndoEntry[] {
    return [...(this.redoStacks.get(userId) ?? [])];
  }

  /**
   * Remove entries that reference now-invalid state.
   */
  pruneInvalidEntries(userId: UserId, context: CollaborationContext): void {
    const stack = this.stacks.get(userId);
    if (!stack) return;

    const valid: UndoEntry[] = [];
    for (const entry of stack) {
      if (this.isEntryValid(entry, context)) {
        valid.push(entry);
      }
    }
    this.stacks.set(userId, valid);
  }

  // ── Private helpers ──

  private getOrCreateStack(userId: UserId): UndoEntry[] {
    let stack = this.stacks.get(userId);
    if (!stack) {
      stack = [];
      this.stacks.set(userId, stack);
    }
    return stack;
  }

  private getOrCreateRedoStack(userId: UserId): UndoEntry[] {
    let redoStack = this.redoStacks.get(userId);
    if (!redoStack) {
      redoStack = [];
      this.redoStacks.set(userId, redoStack);
    }
    return redoStack;
  }

  private nextSequenceNumber(userId: UserId): number {
    const current = this.sequenceCounters.get(userId) ?? 0;
    const next = current + 1;
    this.sequenceCounters.set(userId, next);
    return next;
  }

  private captureState(
    operation: FullDocOperation,
    context: CollaborationContext
  ): UndoCapturedState {
    switch (operation.type) {
      case "addNode": {
        const snapshot = getNodeSnapshot(context.crdt, operation.node.id);
        return {
          kind: "addNode",
          nodeId: operation.node.id,
          parentId: operation.parentId,
          nodeSnapshot: snapshot!
        };
      }
      case "deleteNode": {
        const target = getNodeSnapshot(context.crdt, operation.nodeId);
        const subtree = collectSubtreeSnapshots(context.crdt, operation.nodeId);
        return {
          kind: "deleteNode",
          nodeId: operation.nodeId,
          previousParentId: target?.parentId ?? null,
          subtreeSnapshots: subtree
        };
      }
      case "deleteNodeKeepChildren": {
        const target = getNodeSnapshot(context.crdt, operation.nodeId);
        if (!target) {
          throw new Error(
            `Cannot capture state for deleteNodeKeepChildren: node ${operation.nodeId} not found.`
          );
        }
        const index = findIndexInParent(context.crdt, operation.nodeId);
        return {
          kind: "deleteNodeKeepChildren",
          nodeId: operation.nodeId,
          previousParentId: target.parentId,
          previousChildIds: [...target.children],
          previousIndex: index >= 0 ? index : 0,
          nodeSnapshot: target
        };
      }
      case "renameNode": {
        const node = getNodeSnapshot(context.crdt, operation.nodeId);
        return {
          kind: "renameNode",
          nodeId: operation.nodeId,
          previousTitle: node?.title ?? ""
        };
      }
      case "updateContent": {
        const node = getNodeSnapshot(context.crdt, operation.nodeId);
        return {
          kind: "updateContent",
          nodeId: operation.nodeId,
          previousContent: node?.content ?? ""
        };
      }
      case "updateAttrs": {
        const node = getNodeSnapshot(context.crdt, operation.nodeId);
        const previousValues: Partial<NodeAttrs> = {};
        if (node) {
          for (const key of Object.keys(operation.attrsPatch) as Array<keyof NodeAttrs>) {
            if (key in node.attrs) {
              (previousValues as Record<string, unknown>)[key] = node.attrs[key];
            }
          }
        }
        return {
          kind: "updateAttrs",
          nodeId: operation.nodeId,
          previousValues
        };
      }
      case "updateAcl": {
        const node = getNodeSnapshot(context.crdt, operation.nodeId);
        const previousValues: Partial<NodeAcl> = {};
        if (node) {
          for (const key of Object.keys(operation.aclPatch) as Array<keyof NodeAcl>) {
            if (key in node.acl) {
              (previousValues as Record<string, unknown>)[key] = node.acl[key];
            }
          }
        }
        return {
          kind: "updateAcl",
          nodeId: operation.nodeId,
          previousValues
        };
      }
      default:
        throw new Error(
          `Unsupported operation type for undo tracking: ${(operation as FullDocOperation).type}`
        );
    }
  }

  private computeInverse(
    userId: UserId,
    capturedState: UndoCapturedState,
    context: CollaborationContext
  ): FullDocOperation {
    const now = context.now();

    switch (capturedState.kind) {
      case "addNode":
        return {
          type: "deleteNode",
          nodeId: capturedState.nodeId,
          actorId: userId,
          timestamp: now
        };
      case "deleteNode":
        return {
          type: "resurrectNode",
          nodeId: capturedState.nodeId,
          subtreeNodes: capturedState.subtreeSnapshots,
          actorId: userId,
          timestamp: now
        };
      case "deleteNodeKeepChildren":
        return {
          type: "resurrectNodeKeepChildren",
          nodeId: capturedState.nodeId,
          nodeSnapshot: capturedState.nodeSnapshot,
          previousParentId: capturedState.previousParentId,
          childIds: capturedState.previousChildIds,
          previousIndex: capturedState.previousIndex,
          actorId: userId,
          timestamp: now
        };
      case "renameNode":
        return {
          type: "renameNode",
          nodeId: capturedState.nodeId,
          title: capturedState.previousTitle,
          actorId: userId,
          timestamp: now
        };
      case "updateContent":
        return {
          type: "updateContent",
          nodeId: capturedState.nodeId,
          content: capturedState.previousContent,
          actorId: userId,
          timestamp: now
        };
      case "updateAttrs":
        return {
          type: "updateAttrs",
          nodeId: capturedState.nodeId,
          attrsPatch: capturedState.previousValues,
          actorId: userId,
          timestamp: now
        };
      case "updateAcl":
        return {
          type: "updateAcl",
          nodeId: capturedState.nodeId,
          aclPatch: capturedState.previousValues as Partial<NodeAcl>,
          actorId: userId,
          timestamp: now
        };
      default:
        throw new Error(
          `Unsupported captured state kind: ${(capturedState as UndoCapturedState).kind}`
        );
    }
  }

  private isEntryValid(
    entry: UndoEntry,
    context: CollaborationContext
  ): boolean {
    const state = entry.capturedState;
    const { crdt } = context;

    switch (state.kind) {
      case "addNode":
        return crdt.nodes.has(state.nodeId) || crdt.tombstones.has(state.nodeId);
      case "deleteNode":
      case "deleteNodeKeepChildren":
        return crdt.tombstones.has(state.nodeId);
      case "renameNode":
      case "updateContent":
      case "updateAttrs":
      case "updateAcl":
        return crdt.nodes.has(state.nodeId) || crdt.tombstones.has(state.nodeId);
      default:
        return true;
    }
  }
}
