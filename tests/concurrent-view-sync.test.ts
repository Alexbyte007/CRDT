import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { applyFullDocOperation, deleteNode, updateAttrs } from "../src/crdt/operations";
import { defaultPolicyEngine } from "../src/access-control/default-policy";
import { fromYDoc, type CrdtDocument } from "../src/crdt/document";
import { reconcileDocumentConflicts } from "../src/crdt/conflicts";
import { getDocumentSnapshot, getNodeSnapshot } from "../src/crdt/snapshot";
import { encodeStateVector } from "../src/crdt/state-vector";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { applyBatchViewOperationRequest } from "../src/server/operations";
import type { CollaborationContext } from "../src/server/types";
import { getView, putOperation } from "../src/view/transform";
import type { UpdateAclOperation, User, ViewNode } from "../src/types";

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
    const grantManagerDelete: UpdateAclOperation = {
      type: "updateAcl",
      nodeId: "node-dev-plan",
      aclPatch: {
        deletableRoles: ["admin", "manager"]
      },
      actorId: "u-admin",
      timestamp: 1
    };

    applyFullDocOperation(adminReplica, grantManagerDelete);
    applyFullDocOperation(managerReplica, grantManagerDelete);

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

  it("rejects offline operations whose target was deleted while applying other valid batch items", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");
    const context: CollaborationContext = {
      crdt,
      users: new Map(sampleUsers.map((candidate) => [candidate.id, candidate])),
      now: () => 8,
      processedOperationIds: new Set(),
      sessions: new Map(),
      policyVersion: 1,
      policyEngine: defaultPolicyEngine
    };
    const baseStateVector = encodeStateVector(crdt);

    deleteNode(crdt, {
      type: "deleteNode",
      nodeId: "node-module-a",
      actorId: "u-admin",
      timestamp: 6
    });

    const result = applyBatchViewOperationRequest(context, {
      user: manager,
      operations: [
        {
          id: "offline-rename-deleted",
          baseStateVector,
          createdAt: 4,
          operation: {
            type: "renameNode",
            nodeId: "node-module-a",
            title: "离线重命名已删除节点"
          }
        },
        {
          id: "offline-valid-add",
          baseStateVector,
          createdAt: 5,
          operation: {
            type: "addNode",
            parentId: "node-dev-plan",
            nodeId: "node-valid-after-delete",
            title: "仍然合法的离线新增"
          }
        }
      ]
    });

    const snapshot = getDocumentSnapshot(crdt);
    expect(result.applied).toEqual(["offline-valid-add"]);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]).toMatchObject({
      id: "offline-rename-deleted",
      error: {
        name: "AccessControlError",
        code: "TARGET_DELETED"
      }
    });
    expect(snapshot.nodes["node-valid-after-delete"]).toBeDefined();
    expect(snapshot.nodes["node-module-a"]).toBeUndefined();
  });

  it("rejects concurrent edits and child adds after a confirmed cascade deletes a visible descendant", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");
    const member = user("u-dev-member");
    const context: CollaborationContext = {
      crdt,
      users: new Map(sampleUsers.map((candidate) => [candidate.id, candidate])),
      now: () => 12,
      processedOperationIds: new Set(),
      sessions: new Map(),
      policyVersion: 1,
      policyEngine: defaultPolicyEngine
    };

    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "addNode",
          parentId: "node-root",
          nodeId: "node-cascade-parent",
          title: "管理员父项目",
          content: ""
        },
        { now: 2 }
      )
    );
    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "updateAcl",
          nodeId: "node-cascade-parent",
          aclPatch: {
            visibility: "restricted",
            allowedRoles: ["admin"],
            childAddableRoles: ["admin"]
          }
        },
        { now: 3 }
      )
    );
    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "addNode",
          parentId: "node-cascade-parent",
          nodeId: "node-cascade-child",
          title: "研发成员可见子项目",
          content: "旧内容"
        },
        { now: 4 }
      )
    );
    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "updateAcl",
          nodeId: "node-cascade-child",
          aclPatch: {
            visibility: "restricted",
            allowedRoles: ["admin", "manager", "member"],
            contentEditableRoles: ["admin", "manager", "member"],
            childAddableRoles: ["admin", "manager", "member"]
          }
        },
        { now: 5 }
      )
    );

    const baseStateVector = encodeStateVector(crdt);
    expect(flattenIds(getView(crdt, member, { now: 6 }).roots)).toContain("node-cascade-child");

    expect(() =>
      applyBatchViewOperationRequest(context, {
        user: admin,
        operations: [
          {
            id: "admin-unconfirmed-cascade",
            baseStateVector,
            createdAt: 6,
            operation: {
              type: "deleteNode",
              nodeId: "node-cascade-parent"
            }
          }
        ]
      })
    ).not.toThrow();
    expect(getNodeSnapshot(crdt, "node-cascade-parent")).toBeDefined();

    const adminDelete = applyBatchViewOperationRequest(context, {
      user: admin,
      operations: [
        {
          id: "admin-confirmed-cascade",
          baseStateVector,
          createdAt: 7,
          operation: {
            type: "deleteNode",
            nodeId: "node-cascade-parent",
            confirmedImpact: true
          }
        }
      ]
    });
    expect(adminDelete.applied).toEqual(["admin-confirmed-cascade"]);

    const memberReplay = applyBatchViewOperationRequest(context, {
      user: member,
      operations: [
        {
          id: "member-concurrent-edit-deleted-child",
          baseStateVector,
          createdAt: 8,
          operation: {
            type: "updateContent",
            nodeId: "node-cascade-child",
            content: "成员并发修改"
          }
        },
        {
          id: "member-concurrent-add-under-deleted-child",
          baseStateVector,
          createdAt: 9,
          operation: {
            type: "addNode",
            parentId: "node-cascade-child",
            nodeId: "node-cascade-grandchild",
            title: "成员并发新增"
          }
        }
      ]
    });

    const snapshot = getDocumentSnapshot(crdt);
    expect(memberReplay.applied).toEqual([]);
    expect(memberReplay.rejected).toHaveLength(2);
    expect(memberReplay.rejected.map((item) => item.error.code)).toEqual([
      "TARGET_DELETED",
      "TARGET_DELETED"
    ]);
    expect(snapshot.nodes["node-cascade-parent"]).toBeUndefined();
    expect(snapshot.nodes["node-cascade-child"]).toBeUndefined();
    expect(snapshot.nodes["node-cascade-grandchild"]).toBeUndefined();
    expect(snapshot.tombstones["node-cascade-parent"]).toBeDefined();
    expect(snapshot.tombstones["node-cascade-child"]).toBeDefined();
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
