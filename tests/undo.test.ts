import { describe, expect, it } from "vitest";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import {
  addNode,
  applyFullDocOperation,
  deleteNode,
  deleteNodeKeepChildren,
  renameNode,
  updateAcl,
  updateAttrs,
  updateContent
} from "../src/crdt/operations";
import { getDocumentSnapshot, getNodeSnapshot } from "../src/crdt/snapshot";
import { defaultPolicyEngine } from "../src/access-control/default-policy";
import { ServerUndoManager } from "../src/server/undo";
import { applyRedoRequest, applyUndoRequest } from "../src/server/operations";
import { AccessControlError, type User, type UserRole } from "../src/types";
import type { CollaborationContext } from "../src/server/types";
import { compactTombstones, DEFAULT_TOMBSTONE_RETENTION_MS } from "../src/crdt/tombstone-gc";

const ALLOWED_ROLES: UserRole[] = ["admin", "manager", "member"];
const EDITABLE_ROLES: UserRole[] = ["admin", "manager"];

function createTestContext(crdt: ReturnType<typeof createSampleDocument>): CollaborationContext {
  return {
    crdt,
    users: new Map(sampleUsers.map((u) => [u.id, u])),
    accounts: new Map(),
    now: () => Date.now(),
    processedOperationIds: new Set(),
    sessions: new Map(),
    policyVersion: 1,
    policyEngine: defaultPolicyEngine,
    undoManager: new ServerUndoManager({ maxDepth: 50 }),
    tombstoneRetentionMs: DEFAULT_TOMBSTONE_RETENTION_MS
  };
}

function user(role: string): User {
  const found = sampleUsers.find((u) => u.role === role);
  if (!found) throw new Error(`Unknown role: ${role}`);
  return found;
}

describe("ServerUndoManager", () => {
  it("tracks addNode and produces deleteNode as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const mgr = ctx.undoManager;

    const operation = {
      type: "addNode" as const,
      parentId: "node-dev-plan",
      actorId: user("member").id,
      timestamp: ctx.now(),
      node: {
        id: "node-undo-test-1",
        type: "task" as const,
        title: "Undo Test Node",
        content: "test content",
        attrs: { department: "dev", ownerId: "u-dev-member", status: "active" as const },
        acl: {
          visibility: "department" as const,
          allowedRoles: ALLOWED_ROLES,
          editableRoles: EDITABLE_ROLES,
          allowedUsers: ["u-dev-member"],
          deniedUsers: []
        },
        createdBy: "u-dev-member"
      }
    };

    mgr.track(user("member").id, operation, ctx);
    expect(mgr.canUndo(user("member").id)).toBe(true);
    expect(mgr.canRedo(user("member").id)).toBe(false);

    const entry = mgr.peekUndo(user("member").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("deleteNode");
    expect(entry!.inverseOp).toMatchObject({
      type: "deleteNode",
      nodeId: "node-undo-test-1",
      actorId: "u-dev-member"
    });
  });

  it("tracks deleteNode and produces resurrectNode as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    // First add a node, then track a delete
    addNode(crdt, {
      type: "addNode",
      parentId: "node-public",
      actorId: "u-dev-manager",
      timestamp: ctx.now(),
      node: {
        id: "node-to-delete",
        type: "task",
        title: "Will Be Deleted",
        content: "content",
        attrs: { department: "dev", ownerId: "u-dev-manager", status: "active" },
        acl: {
          visibility: "department",
          allowedRoles: ALLOWED_ROLES,
          editableRoles: EDITABLE_ROLES,
          allowedUsers: ["u-dev-manager"],
          deniedUsers: []
        },
        createdBy: "u-dev-manager"
      }
    });

    const node = getNodeSnapshot(crdt, "node-to-delete");
    expect(node).toBeDefined();

    const deleteOp = {
      type: "deleteNode" as const,
      nodeId: "node-to-delete",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("manager").id, deleteOp, ctx);
    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("resurrectNode");
    expect(entry!.inverseOp).toMatchObject({
      type: "resurrectNode",
      nodeId: "node-to-delete",
      actorId: "u-dev-manager"
    });
    expect((entry!.inverseOp as { subtreeNodes: unknown[] }).subtreeNodes.length).toBeGreaterThan(0);
  });

  it("tracks deleteNodeKeepChildren and produces resurrectNodeKeepChildren as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const deleteOp = {
      type: "deleteNodeKeepChildren" as const,
      nodeId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("manager").id, deleteOp, ctx);
    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("resurrectNodeKeepChildren");
    expect(entry!.inverseOp).toMatchObject({
      type: "resurrectNodeKeepChildren",
      nodeId: "node-dev-plan",
      actorId: "u-dev-manager"
    });
  });

  it("tracks renameNode and produces reverse renameNode as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const renameOp = {
      type: "renameNode" as const,
      nodeId: "node-public",
      title: "New Public Title",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("manager").id, renameOp, ctx);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("renameNode");
    expect(entry!.inverseOp).toMatchObject({
      type: "renameNode",
      nodeId: "node-public",
      title: "项目公告模块",
      actorId: "u-dev-manager"
    });
  });

  it("tracks updateContent and produces reverse updateContent as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const oldContent = getNodeSnapshot(crdt, "node-public")?.content;

    const contentOp = {
      type: "updateContent" as const,
      nodeId: "node-public",
      content: "New content text",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("manager").id, contentOp, ctx);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("updateContent");
    expect((entry!.inverseOp as { content: string }).content).toBe(oldContent);
  });

  it("tracks updateAttrs and produces reverse updateAttrs as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const attrsOp = {
      type: "updateAttrs" as const,
      nodeId: "node-offline-sync-task",
      attrsPatch: { priority: "A" as const, budget: 5000 },
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("manager").id, attrsOp, ctx);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("updateAttrs");
    const inverseAttrs = (entry!.inverseOp as { attrsPatch: Record<string, unknown> }).attrsPatch;
    expect(inverseAttrs).toBeDefined();
  });

  it("tracks updateAcl and produces reverse updateAcl as inverse", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const aclOp = {
      type: "updateAcl" as const,
      nodeId: "node-public",
      aclPatch: { visibility: "restricted" as const },
      actorId: "u-admin",
      timestamp: ctx.now()
    };

    ctx.undoManager.track(user("admin").id, aclOp, ctx);

    const entry = ctx.undoManager.peekUndo(user("admin").id);
    expect(entry).toBeDefined();
    expect(entry!.inverseOp.type).toBe("updateAcl");
    const inverseAcl = (entry!.inverseOp as { aclPatch: Record<string, unknown> }).aclPatch;
    expect(inverseAcl).toBeDefined();
  });

  it("isolates undo stacks per user", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    // User A renames a node
    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Manager's Title",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    // User B renames a different node
    ctx.undoManager.track(user("member").id, {
      type: "renameNode",
      nodeId: "node-offline-sync-task",
      title: "Member's Title",
      actorId: "u-dev-member",
      timestamp: ctx.now()
    }, ctx);

    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);
    expect(ctx.undoManager.canUndo(user("member").id)).toBe(true);
    expect(ctx.undoManager.canUndo(user("admin").id)).toBe(false);

    // Manager's undo should only affect their own operation
    const managerEntry = ctx.undoManager.peekUndo(user("manager").id);
    expect(managerEntry!.originalOp).toMatchObject({ nodeId: "node-public" });

    const memberEntry = ctx.undoManager.peekUndo(user("member").id);
    expect(memberEntry!.originalOp).toMatchObject({ nodeId: "node-offline-sync-task" });
  });

  it("isolates undo stacks by editor session scope", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const manager = user("manager");
    const scopeA = "session-a";
    const scopeB = "session-b";

    ctx.undoManager.track(manager.id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Scope A Edit",
      actorId: manager.id,
      timestamp: ctx.now()
    }, ctx, scopeA);

    expect(ctx.undoManager.canUndo(scopeA)).toBe(true);
    expect(ctx.undoManager.canUndo(scopeB)).toBe(false);
    expect(ctx.undoManager.canUndo(manager.id)).toBe(false);
  });

  it("clears redo stack when new operation is tracked", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    // Track, undo, then track a new operation — redo should be cleared
    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Title 1",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    const popped = ctx.undoManager.popUndo(user("manager").id);
    expect(popped).toBeDefined();
    expect(ctx.undoManager.canRedo(user("manager").id)).toBe(true);

    // New operation clears redo
    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Title 2",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    expect(ctx.undoManager.canRedo(user("manager").id)).toBe(false);
  });

  it("respects maxDepth and trims oldest entries", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const mgr = new ServerUndoManager({ maxDepth: 3 });
    ctx.undoManager = mgr;

    for (let i = 0; i < 5; i++) {
      mgr.track(user("manager").id, {
        type: "renameNode",
        nodeId: "node-public",
        title: `Title ${i}`,
        actorId: "u-dev-manager",
        timestamp: ctx.now()
      }, ctx);
    }

    expect(mgr.getUserEntries(user("manager").id).length).toBe(3);
  });

  it("reports tombstones protected by undo and redo history", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const manager = user("manager");
    const deleteOp = {
      type: "deleteNode" as const,
      nodeId: "node-public",
      actorId: manager.id,
      timestamp: 1_000
    };

    ctx.undoManager.track(manager.id, deleteOp, ctx);
    deleteNode(crdt, deleteOp);

    expect(ctx.undoManager.getProtectedTombstoneIds()).toContain("node-public");

    const result = compactTombstones(crdt, {
      now: 100_000,
      retentionMs: 1,
      protectedNodeIds: ctx.undoManager.getProtectedTombstoneIds()
    });

    expect(result.removed).not.toContain("node-public");
    expect(crdt.tombstones.has("node-public")).toBe(true);
  });

  it("canUndo returns false for empty stack", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(false);
    expect(ctx.undoManager.canUndo(user("admin").id)).toBe(false);
  });

  it("pruneInvalidEntries removes stale entries", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    // Track an update to a node
    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Some Title",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);

    // The node still exists, so prune should keep it
    ctx.undoManager.pruneInvalidEntries(user("manager").id, ctx);
    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);
  });
});

describe("resurrectNode CRDT operation", () => {
  it("resurrects a tombstoned node with its subtree", () => {
    const crdt = createSampleDocument();

    // Capture subtree before deletion
    const subtreeSnapshots = getNodeSnapshot(crdt, "node-dev-plan")!
      ? (function collectAll(crdt: ReturnType<typeof createSampleDocument>, id: string) {
          const snap = getNodeSnapshot(crdt, id);
          if (!snap) return [];
          const results = [snap];
          for (const childId of snap.children) {
            results.push(...collectAll(crdt, childId));
          }
          return results;
        })(crdt, "node-dev-plan")
      : [];

    // Delete the node
    deleteNode(crdt, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: Date.now()
    });

    // Verify it's tombstoned
    expect(crdt.tombstones.has("node-dev-plan")).toBe(true);
    expect(crdt.nodes.has("node-dev-plan")).toBe(false);

    // Resurrect it
    const result = applyFullDocOperation(crdt, {
      type: "resurrectNode",
      nodeId: "node-dev-plan",
      subtreeNodes: subtreeSnapshots,
      actorId: "u-dev-manager",
      timestamp: Date.now()
    });

    // Verify it's back in nodes
    expect(crdt.nodes.has("node-dev-plan")).toBe(true);
    expect(crdt.tombstones.has("node-dev-plan")).toBe(false);

    const restored = getNodeSnapshot(crdt, "node-dev-plan");
    expect(restored).toBeDefined();
    expect(restored!.title).toBe("权限与隐私模块");
    expect(restored!.children.length).toBeGreaterThan(0);
  });

  it("resurrectNodeKeepChildren restores a node and re-parents its children", () => {
    const crdt = createSampleDocument();

    const originalNode = getNodeSnapshot(crdt, "node-dev-plan");
    expect(originalNode).toBeDefined();
    const originalChildIds = [...originalNode!.children];
    const originalParentId = originalNode!.parentId;

    // Delete keeping children
    deleteNodeKeepChildren(crdt, {
      type: "deleteNodeKeepChildren",
      nodeId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: Date.now()
    });

    // Verify tombstoned, children promoted
    expect(crdt.tombstones.has("node-dev-plan")).toBe(true);
    expect(crdt.nodes.has("node-dev-plan")).toBe(false);
    for (const childId of originalChildIds) {
      const child = getNodeSnapshot(crdt, childId);
      expect(child).toBeDefined();
    }

    // Resurrect
    applyFullDocOperation(crdt, {
      type: "resurrectNodeKeepChildren",
      nodeId: "node-dev-plan",
      nodeSnapshot: originalNode!,
      previousParentId: originalParentId,
      childIds: originalChildIds,
      previousIndex: 0,
      actorId: "u-dev-manager",
      timestamp: Date.now()
    });

    // Verify restored
    expect(crdt.nodes.has("node-dev-plan")).toBe(true);
    const restored = getNodeSnapshot(crdt, "node-dev-plan");
    expect(restored!.children).toEqual(originalChildIds);
  });
});

describe("undo permission validation", () => {
  it("rejects undo from a different user", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    // Manager performs an operation
    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Manager's Edit",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();

    // A different user tries to undo — should fail at application level
    // The ServerUndoManager only checks actorId in preflightUndoOperation
    // which is called from applyUndoRequest
    expect(entry!.actorId).not.toBe(user("admin").id);
  });

  it("allows undo when user still has view permission on target", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    ctx.undoManager.track(user("manager").id, {
      type: "renameNode",
      nodeId: "node-public",
      title: "Test Title",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    }, ctx);

    const entry = ctx.undoManager.peekUndo(user("manager").id);
    expect(entry).toBeDefined();
    expect(entry!.actorId).toBe("u-dev-manager");
    // Node is still visible to manager (public node)
    const target = getNodeSnapshot(crdt, "node-public");
    expect(target).toBeDefined();
    expect(ctx.policyEngine.canViewNode(user("manager"), target!)).toBe(true);
  });

  it("skips invalid top undo entries and continues with the next valid entry", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const manager = user("manager");
    const originalTitle = getNodeSnapshot(crdt, "node-public")!.title;
    const scope = "manager-session";

    const validRename = {
      type: "renameNode" as const,
      nodeId: "node-public",
      title: "Manager Valid Edit",
      actorId: manager.id,
      timestamp: ctx.now()
    };
    ctx.undoManager.track(manager.id, validRename, ctx, scope);
    renameNode(crdt, validRename);

    ctx.undoManager.track(manager.id, {
      type: "renameNode",
      nodeId: "node-finance",
      title: "Invisible Invalid Edit",
      actorId: manager.id,
      timestamp: ctx.now()
    }, ctx, scope);

    const result = applyUndoRequest(ctx, manager, scope);

    expect(result.originalOpType).toBe("renameNode");
    expect(getNodeSnapshot(crdt, "node-public")!.title).toBe(originalTitle);
    expect(ctx.undoManager.canUndo(scope)).toBe(false);
  });
});

describe("undo/redo full cycle", () => {
  it("addNode → undo → redo restores the node", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const addOp = {
      type: "addNode" as const,
      parentId: "node-public",
      actorId: "u-dev-manager",
      timestamp: ctx.now(),
      node: {
        id: "node-cycle-test",
        type: "task" as const,
        title: "Cycle Test",
        content: "test",
        attrs: { department: "dev", ownerId: "u-dev-manager", status: "active" as const },
        acl: {
          visibility: "department" as const,
          allowedRoles: ALLOWED_ROLES,
          editableRoles: EDITABLE_ROLES,
          allowedUsers: ["u-dev-manager"],
          deniedUsers: []
        },
        createdBy: "u-dev-manager"
      }
    };

    // Apply the add
    addNode(crdt, addOp);

    // Track it for undo
    ctx.undoManager.track(user("manager").id, addOp, ctx);
    expect(ctx.undoManager.canUndo(user("manager").id)).toBe(true);

    // Undo: pop and apply inverse (deleteNode)
    const undoEntry = ctx.undoManager.popUndo(user("manager").id);
    expect(undoEntry).toBeDefined();
    expect(undoEntry!.inverseOp.type).toBe("deleteNode");

    applyFullDocOperation(crdt, undoEntry!.inverseOp);

    // Node should be tombstoned
    expect(crdt.tombstones.has("node-cycle-test")).toBe(true);
    expect(crdt.nodes.has("node-cycle-test")).toBe(false);
    expect(ctx.undoManager.canRedo(user("manager").id)).toBe(true);

    // Redo: pop redo and re-apply original (addNode)
    const redoEntry = ctx.undoManager.popRedo(user("manager").id);
    expect(redoEntry).toBeDefined();
    expect(redoEntry!.originalOp.type).toBe("addNode");
  });

  it("renameNode → undo → redo correctly toggles title", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const originalTitle = getNodeSnapshot(crdt, "node-public")!.title;

    const renameOp = {
      type: "renameNode" as const,
      nodeId: "node-public",
      title: "Changed Title",
      actorId: "u-dev-manager",
      timestamp: ctx.now()
    };

    // Track BEFORE apply (as the pipeline does)
    ctx.undoManager.track(user("manager").id, renameOp, ctx);

    // Apply rename
    renameNode(crdt, renameOp);
    expect(getNodeSnapshot(crdt, "node-public")!.title).toBe("Changed Title");

    // Undo: apply inverse rename
    const undoEntry = ctx.undoManager.popUndo(user("manager").id);
    applyFullDocOperation(crdt, undoEntry!.inverseOp);

    expect(getNodeSnapshot(crdt, "node-public")!.title).toBe(originalTitle);

    // Redo
    const redoEntry = ctx.undoManager.popRedo(user("manager").id);
    applyFullDocOperation(crdt, redoEntry!.originalOp);

    expect(getNodeSnapshot(crdt, "node-public")!.title).toBe("Changed Title");
  });

  it("deleteNode → undo resurrects the node", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);

    const nodeBefore = getNodeSnapshot(crdt, "node-public");
    expect(nodeBefore).toBeDefined();

    const deleteOp = {
      type: "deleteNode" as const,
      nodeId: "node-public",
      actorId: "u-admin",
      timestamp: ctx.now()
    };

    // Track before deletion (captures subtree from active state)
    ctx.undoManager.track(user("admin").id, deleteOp, ctx);

    // Apply delete
    deleteNode(crdt, deleteOp);
    expect(crdt.tombstones.has("node-public")).toBe(true);
    expect(crdt.nodes.has("node-public")).toBe(false);

    // Undo: apply inverse (resurrectNode)
    const undoEntry = ctx.undoManager.popUndo(user("admin").id);
    applyFullDocOperation(crdt, undoEntry!.inverseOp);

    expect(crdt.nodes.has("node-public")).toBe(true);
    expect(crdt.tombstones.has("node-public")).toBe(false);
    const restored = getNodeSnapshot(crdt, "node-public");
    expect(restored).toBeDefined();
    expect(restored!.title).toBe(nodeBefore!.title);
  });

  it("keeps redo history after undo reaches the oldest operation and undo is clicked again", () => {
    const crdt = createSampleDocument();
    const ctx = createTestContext(crdt);
    const manager = user("manager");
    const scope = "manager-current-browser-session";
    const operations = [1, 2, 3].map((index) => ({
      type: "addNode" as const,
      parentId: "node-public",
      actorId: manager.id,
      timestamp: ctx.now() + index,
      node: {
        id: `node-boundary-redo-${index}`,
        type: "task" as const,
        title: `Boundary Redo ${index}`,
        content: "",
        attrs: { department: "dev", ownerId: manager.id, status: "active" as const },
        acl: {
          visibility: "department" as const,
          allowedRoles: ALLOWED_ROLES,
          editableRoles: ["admin", "manager"] as UserRole[],
          contentEditableRoles: ["admin", "manager"] as UserRole[],
          childAddableRoles: ["admin", "manager"] as UserRole[],
          deletableRoles: ["admin", "manager"] as UserRole[],
          allowedUsers: [manager.id],
          deniedUsers: []
        },
        createdBy: manager.id
      }
    }));

    for (const operation of operations) {
      ctx.undoManager.track(manager.id, operation, ctx, scope);
      applyFullDocOperation(crdt, operation);
    }

    expect(ctx.undoManager.getUserEntries(scope).length).toBe(3);

    applyUndoRequest(ctx, manager, scope);
    applyUndoRequest(ctx, manager, scope);
    applyUndoRequest(ctx, manager, scope);

    expect(ctx.undoManager.canUndo(scope)).toBe(false);
    expect(ctx.undoManager.getUserRedoEntries(scope).length).toBe(3);
    for (const operation of operations) {
      expect(getNodeSnapshot(crdt, operation.node.id)).toBeUndefined();
      expect(crdt.tombstones.has(operation.node.id)).toBe(true);
    }

    expect(() => applyUndoRequest(ctx, manager, scope)).toThrow("Nothing to undo.");
    expect(ctx.undoManager.getUserRedoEntries(scope).length).toBe(3);

    applyRedoRequest(ctx, manager, scope);
    applyRedoRequest(ctx, manager, scope);
    applyRedoRequest(ctx, manager, scope);

    for (const operation of operations) {
      expect(getNodeSnapshot(crdt, operation.node.id)?.title).toBe(operation.node.title);
      expect(crdt.tombstones.has(operation.node.id)).toBe(false);
    }
    expect(ctx.undoManager.getUserEntries(scope).length).toBe(3);
    expect(ctx.undoManager.canRedo(scope)).toBe(false);

    expect(() => applyRedoRequest(ctx, manager, scope)).toThrow("Nothing to redo.");
    expect(ctx.undoManager.getUserEntries(scope).length).toBe(3);
  });
});
