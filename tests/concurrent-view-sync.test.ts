import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { applyFullDocOperation, updateAttrs } from "../src/crdt/operations";
import { defaultPolicyEngine } from "../src/access-control/default-policy";
import { fromYDoc, type CrdtDocument } from "../src/crdt/document";
import { reconcileDocumentConflicts } from "../src/crdt/conflicts";
import { getDocumentSnapshot, getNodeSnapshot } from "../src/crdt/snapshot";
import { encodeStateVector } from "../src/crdt/state-vector";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { applyBatchViewOperationRequest } from "../src/server/operations";
import type { CollaborationContext } from "../src/server/types";
import { getView, putOperation } from "../src/view/transform";
import type { User, ViewNode } from "../src/types";

describe("concurrent heterogeneous view sync", () => {
  it("does not lose concurrent adds from manager and admin", () => {
    const { left: managerReplica, right: adminReplica } = forkSampleDocument();

    applyFullDocOperation(
      managerReplica,
      putOperation(
        managerReplica,
        user("u-dev-manager"),
        {
          type: "addNode",
          parentId: "node-dev-plan",
          nodeId: "node-manager-add",
          title: "经理新增节点 A",
          content: "来自经理视图"
        },
        { now: 2 }
      )
    );
    applyFullDocOperation(
      adminReplica,
      putOperation(
        adminReplica,
        user("u-admin"),
        {
          type: "addNode",
          parentId: "node-dev-plan",
          nodeId: "node-admin-add",
          title: "管理员新增节点 B",
          content: "来自管理员视图"
        },
        { now: 3 }
      )
    );

    syncAndReconcile(managerReplica, adminReplica);

    const snapshot = getDocumentSnapshot(managerReplica);
    expect(snapshot.nodes["node-manager-add"]).toBeDefined();
    expect(snapshot.nodes["node-admin-add"]).toBeDefined();
    expect(new Set(snapshot.nodes["node-dev-plan"].children)).toEqual(
      new Set(["node-module-a", "node-manager-add", "node-admin-add"])
    );
  });

  it("keeps hidden-field and visible-field concurrent updates aligned with latest view policy", () => {
    const { left: adminReplica, right: managerReplica } = forkSampleDocument();

    applyFullDocOperation(adminReplica, {
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "archived"
      },
      actorId: "u-admin",
      timestamp: 2
    });
    applyFullDocOperation(
      managerReplica,
      putOperation(
        managerReplica,
        user("u-dev-manager"),
        {
          type: "renameNode",
          nodeId: "node-dev-plan",
          title: "研发计划 - 经理重命名"
        },
        { now: 3 }
      )
    );

    syncAndReconcile(adminReplica, managerReplica);

    const node = getNodeSnapshot(adminReplica, "node-dev-plan");
    expect(node?.attrs.status).toBe("archived");
    expect(node?.title).toBe("研发计划 - 经理重命名");

    const managerNode = findViewNode(getView(adminReplica, user("u-dev-manager"), { now: 4 }).roots, "node-dev-plan");
    expect(managerNode).toBeUndefined();
    expect(flattenIds(getView(adminReplica, user("u-dev-member"), { now: 4 }).roots)).not.toContain(
      "node-dev-plan"
    );
  });

  it("uses delete-wins when admin updates content while manager deletes the same node", () => {
    const { left: adminReplica, right: managerReplica } = forkSampleDocument();

    applyFullDocOperation(adminReplica, {
      type: "updateContent",
      nodeId: "node-dev-plan",
      content: "管理员并发修改内容",
      actorId: "u-admin",
      timestamp: 2
    });
    applyFullDocOperation(
      managerReplica,
      putOperation(
        managerReplica,
        user("u-dev-manager"),
        {
          type: "deleteNode",
          nodeId: "node-dev-plan"
        },
        { now: 3 }
      )
    );

    syncAndReconcile(adminReplica, managerReplica);

    const snapshot = getDocumentSnapshot(adminReplica);
    expect(snapshot.nodes["node-dev-plan"]).toBeUndefined();
    expect(snapshot.nodes["node-module-a"]).toBeUndefined();
    expect(snapshot.tombstones["node-dev-plan"]).toBeDefined();
    expect(snapshot.nodes["node-root"].children).not.toContain("node-dev-plan");
  });

  it("regenerates member view after permission changes caused by an archive status update", () => {
    const crdt = createSampleDocument();

    updateAttrs(crdt, {
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "active"
      },
      actorId: "u-admin",
      timestamp: 2
    });
    expect(flattenIds(getView(crdt, user("u-dev-member"), { now: 3 }).roots)).toContain(
      "node-dev-plan"
    );

    applyFullDocOperation(crdt, {
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "archived"
      },
      actorId: "u-admin",
      timestamp: 4
    });

    const node = getNodeSnapshot(crdt, "node-dev-plan");
    expect(node?.attrs.status).toBe("archived");
    expect(flattenIds(getView(crdt, user("u-dev-member"), { now: 5 }).roots)).not.toContain(
      "node-dev-plan"
    );
  });

  it("syncs offline view operations after reconnect while preserving server-side admin updates", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");
    const context: CollaborationContext = {
      crdt,
      users: new Map(sampleUsers.map((candidate) => [candidate.id, candidate])),
      now: () => 5,
      processedOperationIds: new Set(),
      sessions: new Map(),
      policyVersion: 1,
      policyEngine: defaultPolicyEngine
    };
    const baseStateVector = encodeStateVector(crdt);

    applyFullDocOperation(crdt, {
      type: "updateContent",
      nodeId: "node-public",
      content: "管理员在用户离线期间更新公开说明。",
      actorId: "u-admin",
      timestamp: 4
    });

    const result = applyBatchViewOperationRequest(context, {
      user: manager,
      operations: [
        {
          id: "offline-add-1",
          baseStateVector,
          createdAt: 3,
          operation: {
            type: "addNode",
            parentId: "node-dev-plan",
            nodeId: "node-offline-add",
            title: "离线新增节点",
            content: "用户断线时创建"
          }
        }
      ]
    });

    const snapshot = getDocumentSnapshot(crdt);
    expect(result.applied).toEqual(["offline-add-1"]);
    expect(result.rejected).toEqual([]);
    expect(snapshot.nodes["node-public"].content).toBe("管理员在用户离线期间更新公开说明。");
    expect(snapshot.nodes["node-offline-add"]).toBeDefined();
    expect(flattenIds(result.view.roots)).toContain("node-offline-add");
    expect(findViewNode(result.view.roots, "node-public")?.content).toBe(
      "管理员在用户离线期间更新公开说明。"
    );
  });
});

function forkSampleDocument(): { left: CrdtDocument; right: CrdtDocument } {
  const left = createSampleDocument();
  const rightDoc = new Y.Doc();
  Y.applyUpdate(rightDoc, Y.encodeStateAsUpdate(left.doc));
  return {
    left,
    right: fromYDoc(rightDoc)
  };
}

function syncAndReconcile(left: CrdtDocument, right: CrdtDocument): void {
  Y.applyUpdate(left.doc, Y.encodeStateAsUpdate(right.doc));
  Y.applyUpdate(right.doc, Y.encodeStateAsUpdate(left.doc));
  reconcileDocumentConflicts(left, { now: 10 });
  reconcileDocumentConflicts(right, { now: 10 });
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

function findViewNode(nodes: ViewNode[], nodeId: string): ViewNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const child = findViewNode(node.children, nodeId);
    if (child) {
      return child;
    }
  }
  return undefined;
}
