import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { applyFullDocOperation, deleteNode, updateAttrs, updateContent } from "../src/crdt/operations";
import { fromYDoc } from "../src/crdt/document";
import { reconcileDocumentConflicts } from "../src/crdt/conflicts";
import { getDocumentSnapshot, getNodeSnapshot } from "../src/crdt/snapshot";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { getView } from "../src/view/transform";
import type { NewTreeNode, User, ViewNode } from "../src/types";

describe("privacy-aware conflict resolution", () => {
  it("keeps concurrent adds under the same parent", () => {
    const { left, right } = forkSampleDocument();

    applyFullDocOperation(left, {
      type: "addNode",
      parentId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 2,
      node: newNode("node-concurrent-a", "并发新增 A")
    });
    applyFullDocOperation(right, {
      type: "addNode",
      parentId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 3,
      node: newNode("node-concurrent-b", "并发新增 B")
    });

    syncAndReconcile(left, right);

    const leftChildren = getNodeSnapshot(left, "node-dev-plan")?.children ?? [];
    const rightChildren = getNodeSnapshot(right, "node-dev-plan")?.children ?? [];
    expect(new Set(leftChildren)).toEqual(
      new Set(["node-module-a", "node-concurrent-a", "node-concurrent-b"])
    );
    expect(new Set(rightChildren)).toEqual(new Set(leftChildren));
  });

  it("keeps different-field concurrent updates and regenerates filtered views", () => {
    const { left, right } = forkSampleDocument();

    updateAttrs(left, {
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        department: "finance"
      },
      actorId: "u-admin",
      timestamp: 2
    });
    applyFullDocOperation(right, {
      type: "renameNode",
      nodeId: "node-dev-plan",
      title: "研发计划已改名",
      actorId: "u-dev-manager",
      timestamp: 3
    });

    syncAndReconcile(left, right);

    const node = getNodeSnapshot(left, "node-dev-plan");
    expect(node?.title).toBe("研发计划已改名");
    expect(node?.attrs.department).toBe("finance");
    expect(flattenIds(getView(left, user("u-admin"), { now: 4 }).roots)).toContain("node-dev-plan");
    expect(flattenIds(getView(left, user("u-dev-member"), { now: 4 }).roots)).not.toContain(
      "node-dev-plan"
    );
  });

  it("uses delete-wins when a node is deleted concurrently with a content update", () => {
    const { left, right } = forkSampleDocument();

    deleteNode(left, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-admin",
      timestamp: 2
    });
    updateContent(right, {
      type: "updateContent",
      nodeId: "node-dev-plan",
      content: "这个并发修改不应复活节点。",
      actorId: "u-dev-manager",
      timestamp: 3
    });

    syncAndReconcile(left, right);

    const snapshot = getDocumentSnapshot(left);
    expect(snapshot.nodes["node-dev-plan"]).toBeUndefined();
    expect(snapshot.nodes["node-module-a"]).toBeUndefined();
    expect(snapshot.nodes["node-root"].children).toEqual([
      "node-public",
      "node-dev-requirements",
      "node-test-announcement",
      "node-test-plan",
      "node-test-bugs",
      "node-finance"
    ]);
    expect(snapshot.tombstones["node-dev-plan"]).toBeDefined();
    expect(flattenIds(getView(left, user("u-admin"), { now: 4 }).roots)).not.toContain(
      "node-dev-plan"
    );
  });

  it("resolves hidden-field update versus visible structure delete by tombstoning the node", () => {
    const { left, right } = forkSampleDocument();

    updateAttrs(left, {
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "archived"
      },
      actorId: "u-admin",
      timestamp: 2
    });
    deleteNode(right, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 3
    });

    syncAndReconcile(left, right);

    const snapshot = getDocumentSnapshot(left);
    expect(snapshot.nodes["node-dev-plan"]).toBeUndefined();
    expect(snapshot.tombstones["node-dev-plan"]).toBeDefined();
    expect(snapshot.nodes["node-root"].children).not.toContain("node-dev-plan");
    expect(flattenIds(getView(left, user("u-dev-manager"), { now: 4 }).roots)).not.toContain(
      "node-dev-plan"
    );
  });

  it("tombstones active descendants when their parent was deleted concurrently", () => {
    const { left, right } = forkSampleDocument();

    deleteNode(left, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-admin",
      timestamp: 2
    });
    applyFullDocOperation(right, {
      type: "addNode",
      parentId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 3,
      node: newNode("node-child-after-delete", "删除并发新增子节点")
    });

    syncAndReconcile(left, right);

    const snapshot = getDocumentSnapshot(left);
    expect(snapshot.nodes["node-child-after-delete"]).toBeUndefined();
    expect(snapshot.tombstones["node-child-after-delete"]).toBeDefined();
    expect(snapshot.nodes["node-root"].children).not.toContain("node-dev-plan");
  });

  it("rejects reusing a tombstoned node id", () => {
    const crdt = createSampleDocument();
    deleteNode(crdt, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-admin",
      timestamp: 2
    });

    expect(() =>
      applyFullDocOperation(crdt, {
        type: "addNode",
        parentId: "node-root",
        actorId: "u-admin",
        timestamp: 3,
        node: newNode("node-dev-plan", "复用已删除 ID")
      })
    ).toThrowError(/Deleted node id cannot be reused/);
  });
});

function forkSampleDocument(): { left: ReturnType<typeof createSampleDocument>; right: ReturnType<typeof fromYDoc> } {
  const left = createSampleDocument();
  const rightDoc = new Y.Doc();
  Y.applyUpdate(rightDoc, Y.encodeStateAsUpdate(left.doc));
  return {
    left,
    right: fromYDoc(rightDoc)
  };
}

function syncAndReconcile(left: ReturnType<typeof createSampleDocument>, right: ReturnType<typeof fromYDoc>): void {
  Y.applyUpdate(left.doc, Y.encodeStateAsUpdate(right.doc));
  Y.applyUpdate(right.doc, Y.encodeStateAsUpdate(left.doc));
  reconcileDocumentConflicts(left, { now: 10 });
  reconcileDocumentConflicts(right, { now: 10 });
}

function newNode(id: string, title: string): NewTreeNode {
  return {
    id,
    type: "doc" as const,
    title,
    content: "",
    attrs: {
      department: "dev",
      ownerId: "u-dev-manager",
      tags: [],
      status: "active" as const
    },
    acl: {
      visibility: "department" as const,
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager"],
      allowedUsers: ["u-dev-manager"],
      deniedUsers: []
    },
    createdBy: "u-dev-manager"
  };
}

function user(id: string): User {
  const found = sampleUsers.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Unknown sample user: ${id}`);
  }
  return found;
}

function flattenIds(nodes: ViewNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenIds(node.children)]);
}
