import * as Y from "yjs";
import { describe, expect, it } from "vitest";
import { createSampleDocument } from "../src/fixtures/sample";
import { addNode, deleteNode, renameNode, updateAcl, updateAttrs, updateContent } from "../src/crdt/operations";
import { createCrdtDocument, fromYDoc } from "../src/crdt/document";
import { getDocumentSnapshot, getNodeSnapshot } from "../src/crdt/snapshot";

describe("Yjs JSON tree document operations", () => {
  it("creates the expected sample tree", () => {
    const crdt = createSampleDocument();
    const snapshot = getDocumentSnapshot(crdt);

    expect(snapshot.meta.docId).toBe("doc-sample");
    expect(snapshot.rootIds).toEqual(["node-root"]);
    expect(snapshot.nodes["node-root"].children).toEqual([
      "node-public",
      "node-dev-plan",
      "node-finance"
    ]);
    expect(snapshot.nodes["node-dev-plan"].children).toEqual(["node-module-a"]);
  });

  it("adds a child node under an existing parent", () => {
    const crdt = createSampleDocument();

    addNode(crdt, {
      type: "addNode",
      parentId: "node-dev-plan",
      index: 1,
      actorId: "u-dev-manager",
      timestamp: 2,
      node: {
        id: "node-api-design",
        type: "task",
        title: "接口设计",
        content: "API 草案",
        attrs: {
          department: "dev",
          ownerId: "u-dev-manager",
          status: "active"
        },
        acl: {
          visibility: "department",
          allowedRoles: ["admin", "manager", "member"],
          editableRoles: ["admin", "manager"],
          allowedUsers: ["u-dev-manager"],
          deniedUsers: []
        },
        createdBy: "u-dev-manager"
      }
    });

    expect(getNodeSnapshot(crdt, "node-api-design")?.parentId).toBe("node-dev-plan");
    expect(getNodeSnapshot(crdt, "node-dev-plan")?.children).toEqual([
      "node-module-a",
      "node-api-design"
    ]);
  });

  it("renames, updates content, and patches attrs", () => {
    const crdt = createSampleDocument();

    renameNode(crdt, {
      type: "renameNode",
      nodeId: "node-public",
      title: "公开项目说明",
      actorId: "u-admin",
      timestamp: 3
    });

    updateContent(crdt, {
      type: "updateContent",
      nodeId: "node-public",
      content: "更新后的公开说明。",
      actorId: "u-admin",
      timestamp: 4
    });

    updateAttrs(crdt, {
      type: "updateAttrs",
      nodeId: "node-public",
      attrsPatch: {
        tags: ["public", "readme"]
      },
      actorId: "u-admin",
      timestamp: 5
    });

    const node = getNodeSnapshot(crdt, "node-public");
    expect(node?.title).toBe("公开项目说明");
    expect(node?.content).toBe("更新后的公开说明。");
    expect(node?.attrs.tags).toEqual(["public", "readme"]);
    expect(node?.updatedAt).toBe(5);
  });

  it("updates node acl audience", () => {
    const crdt = createSampleDocument();

    updateAcl(crdt, {
      type: "updateAcl",
      nodeId: "node-public",
      aclPatch: {
        visibility: "restricted",
        allowedRoles: ["admin", "manager"]
      },
      actorId: "u-admin",
      timestamp: 6
    });

    const node = getNodeSnapshot(crdt, "node-public");
    expect(node?.acl.visibility).toBe("restricted");
    expect(node?.acl.allowedRoles).toEqual(["admin", "manager"]);
    expect(node?.updatedAt).toBe(6);
  });

  it("deletes a subtree and records tombstones", () => {
    const crdt = createSampleDocument();

    const deleted = deleteNode(crdt, {
      type: "deleteNode",
      nodeId: "node-dev-plan",
      actorId: "u-admin",
      timestamp: 6
    });

    const snapshot = getDocumentSnapshot(crdt);
    expect(deleted.map((node) => node.id)).toEqual(["node-dev-plan", "node-module-a"]);
    expect(snapshot.nodes["node-dev-plan"]).toBeUndefined();
    expect(snapshot.nodes["node-module-a"]).toBeUndefined();
    expect(snapshot.nodes["node-root"].children).toEqual(["node-public", "node-finance"]);
    expect(snapshot.tombstones["node-dev-plan"].updatedAt).toBe(6);
    expect(snapshot.tombstones["node-module-a"].updatedAt).toBe(6);
  });

  it("converges after exchanging Yjs updates", () => {
    const left = createCrdtDocument({
      docId: "doc-converge",
      title: "收敛测试",
      now: 1
    });
    const rightDoc = new Y.Doc();
    Y.applyUpdate(rightDoc, Y.encodeStateAsUpdate(left.doc));
    const right = fromYDoc(rightDoc);

    addNode(left, {
      type: "addNode",
      parentId: null,
      actorId: "u-admin",
      timestamp: 2,
      node: {
        id: "node-left",
        type: "doc",
        title: "左侧节点",
        content: "",
        attrs: {
          department: "dev",
          ownerId: "u-admin",
          status: "active"
        },
        acl: {
          visibility: "public",
          allowedRoles: ["admin", "manager", "member", "guest"],
          editableRoles: ["admin"],
          allowedUsers: [],
          deniedUsers: []
        },
        createdBy: "u-admin"
      }
    });

    addNode(right, {
      type: "addNode",
      parentId: null,
      actorId: "u-admin",
      timestamp: 3,
      node: {
        id: "node-right",
        type: "doc",
        title: "右侧节点",
        content: "",
        attrs: {
          department: "dev",
          ownerId: "u-admin",
          status: "active"
        },
        acl: {
          visibility: "public",
          allowedRoles: ["admin", "manager", "member", "guest"],
          editableRoles: ["admin"],
          allowedUsers: [],
          deniedUsers: []
        },
        createdBy: "u-admin"
      }
    });

    Y.applyUpdate(left.doc, Y.encodeStateAsUpdate(right.doc));
    Y.applyUpdate(right.doc, Y.encodeStateAsUpdate(left.doc));

    const leftSnapshot = getDocumentSnapshot(left);
    const rightSnapshot = getDocumentSnapshot(right);

    expect(new Set(leftSnapshot.rootIds)).toEqual(new Set(["node-left", "node-right"]));
    expect(new Set(rightSnapshot.rootIds)).toEqual(new Set(["node-left", "node-right"]));
    expect(leftSnapshot.nodes["node-left"].title).toBe(rightSnapshot.nodes["node-left"].title);
    expect(leftSnapshot.nodes["node-right"].title).toBe(rightSnapshot.nodes["node-right"].title);
  });
});
