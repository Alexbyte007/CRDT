import { describe, expect, it } from "vitest";
import { canEditNode, canViewNode } from "../src/access-control/policy";
import { applyFullDocOperation } from "../src/crdt/operations";
import { getNodeSnapshot } from "../src/crdt/snapshot";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { getView, putOperation, validateViewOperation } from "../src/view/transform";
import { AccessControlError, type User, type ViewNode } from "../src/types";

describe("privacy view transform", () => {
  it("projects different views for admin, manager, member, and guest", () => {
    const crdt = createSampleDocument();

    const adminView = getView(crdt, user("u-admin"), { now: 10 });
    const managerView = getView(crdt, user("u-dev-manager"), { now: 10 });
    const memberView = getView(crdt, user("u-dev-member"), { now: 10 });
    const guestView = getView(crdt, user("u-guest"), { now: 10 });

    expect(flattenIds(adminView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-dev-plan",
      "node-module-a",
      "node-finance"
    ]);
    expect(flattenIds(managerView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-dev-plan",
      "node-module-a"
    ]);
    expect(flattenIds(memberView.roots)).toEqual(["node-root", "node-public", "node-dev-plan"]);
    expect(flattenIds(guestView.roots)).toEqual(["node-root", "node-public"]);
  });

  it("does not expose acl metadata in ordinary user views", () => {
    const crdt = createSampleDocument();
    const memberView = getView(crdt, user("u-dev-member"), { now: 10 });
    const devPlan = findViewNode(memberView.roots, "node-dev-plan");

    expect(devPlan).toBeDefined();
    expect(devPlan?.attrs).toEqual({
      department: "dev",
      tags: [],
      status: "active"
    });
    expect(JSON.stringify(devPlan)).not.toContain("allowedRoles");
    expect(JSON.stringify(devPlan)).not.toContain("editableRoles");
  });

  it("computes node visibility and edit permissions from RBAC + ABAC rules", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");
    const member = user("u-dev-member");
    const finance = getNodeSnapshot(crdt, "node-finance");
    const devPlan = getNodeSnapshot(crdt, "node-dev-plan");
    const moduleA = getNodeSnapshot(crdt, "node-module-a");

    expect(finance).toBeDefined();
    expect(devPlan).toBeDefined();
    expect(moduleA).toBeDefined();

    expect(canViewNode(member, finance!)).toBe(false);
    expect(canViewNode(member, moduleA!)).toBe(false);
    expect(canViewNode(manager, moduleA!)).toBe(true);
    expect(canEditNode(manager, devPlan!, "addNode")).toBe(true);
    expect(canEditNode(member, devPlan!, "deleteNode")).toBe(false);
  });

  it("rejects forged view operations against invisible nodes", () => {
    const crdt = createSampleDocument();
    const member = user("u-dev-member");

    expect(() =>
      validateViewOperation(crdt, member, {
        type: "renameNode",
        nodeId: "node-finance",
        title: "偷偷改财务预算"
      })
    ).toThrow(AccessControlError);
  });

  it("maps authorized view operations back to full document operations", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");

    const fullOperation = putOperation(
      crdt,
      manager,
      {
        type: "addNode",
        parentId: "node-dev-plan",
        nodeId: "node-api",
        title: "接口设计",
        content: "接口草案",
        index: 1
      },
      { now: 20 }
    );

    expect(fullOperation).toMatchObject({
      type: "addNode",
      parentId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 20
    });

    if (fullOperation.type !== "addNode") {
      throw new Error("Expected addNode operation.");
    }

    expect(fullOperation.node.attrs).toEqual({
      department: "dev",
      ownerId: "u-dev-manager",
      tags: [],
      status: "active"
    });
    expect(fullOperation.node.acl).toEqual({
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin", "manager"],
      allowedUsers: ["u-dev-manager"],
      deniedUsers: []
    });

    applyFullDocOperation(crdt, fullOperation);

    const addedNode = getNodeSnapshot(crdt, "node-api");
    const parent = getNodeSnapshot(crdt, "node-dev-plan");
    expect(addedNode?.title).toBe("接口设计");
    expect(parent?.children).toEqual(["node-module-a", "node-api"]);
  });

  it("inherits parent visibility while granting creator-and-higher operation permissions", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");
    const manager = user("u-dev-manager");
    const member = user("u-dev-member");

    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "updateAcl",
          nodeId: "node-public",
          aclPatch: {
            childAddableRoles: ["admin", "manager", "member"]
          }
        },
        { now: 21 }
      )
    );

    const fullOperation = putOperation(
      crdt,
      member,
      {
        type: "addNode",
        parentId: "node-public",
        nodeId: "node-member-child",
        title: "成员创建的节点",
        content: "创建者和更高角色可操作"
      },
      { now: 22 }
    );

    if (fullOperation.type !== "addNode") {
      throw new Error("Expected addNode operation.");
    }

    expect(fullOperation.node.acl).toEqual({
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager", "member"],
      allowedUsers: ["u-dev-member"],
      deniedUsers: []
    });

    applyFullDocOperation(crdt, fullOperation);

    const memberView = getView(crdt, member, { now: 23 });
    const managerView = getView(crdt, manager, { now: 23 });
    const adminView = getView(crdt, admin, { now: 23 });

    const memberNode = findViewNode(memberView.roots, "node-member-child");
    const managerNode = findViewNode(managerView.roots, "node-member-child");
    const adminNode = findViewNode(adminView.roots, "node-member-child");
    const guestNode = findViewNode(getView(crdt, user("u-guest"), { now: 23 }).roots, "node-member-child");

    expect(memberNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: true,
      canDelete: true
    });
    expect(managerNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: true,
      canDelete: true
    });
    expect(adminNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: true,
      canDelete: true
    });
    expect(guestNode?.permissions).toMatchObject({
      canRename: false,
      canEditContent: false,
      canAddChild: false,
      canDelete: false
    });
  });

  it("filters manager attr updates to allowed node attributes", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");

    const fullOperation = putOperation(
      crdt,
      manager,
      {
        type: "updateAttrs",
        nodeId: "node-dev-plan",
        attrsPatch: {
          status: "archived",
          department: "finance",
          tags: ["review"]
        }
      },
      { now: 30 }
    );

    expect(fullOperation).toEqual({
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "archived",
        tags: ["review"]
      },
      actorId: "u-dev-manager",
      timestamp: 30
    });
  });

  it("allows admins to update node audience without exposing acl controls to ordinary users", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");
    const member = user("u-dev-member");

    const adminNode = findViewNode(getView(crdt, admin, { now: 31 }).roots, "node-public");
    const memberNode = findViewNode(getView(crdt, member, { now: 31 }).roots, "node-public");

    expect(adminNode?.acl).toEqual({
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"]
    });
    expect(adminNode?.permissions.canEditAcl).toBe(true);
    expect(memberNode?.acl).toBeUndefined();
    expect(memberNode?.permissions.canEditAcl).toBe(false);

    const fullOperation = putOperation(
      crdt,
      admin,
      {
        type: "updateAcl",
        nodeId: "node-public",
        aclPatch: {
          visibility: "restricted",
          allowedRoles: ["admin", "manager"]
        }
      },
      { now: 32 }
    );

    expect(fullOperation).toEqual({
      type: "updateAcl",
      nodeId: "node-public",
      aclPatch: {
        visibility: "restricted",
        allowedRoles: ["admin", "manager"]
      },
      actorId: "u-admin",
      timestamp: 32
    });

    applyFullDocOperation(crdt, fullOperation);
    expect(getNodeSnapshot(crdt, "node-public")?.acl).toMatchObject({
      visibility: "restricted",
      allowedRoles: ["admin", "manager"]
    });
    expect(findViewNode(getView(crdt, user("u-dev-manager"), { now: 33 }).roots, "node-public")).toBeDefined();
    expect(findViewNode(getView(crdt, user("u-dev-member"), { now: 33 }).roots, "node-public")).toBeUndefined();
    expect(findViewNode(getView(crdt, user("u-guest"), { now: 33 }).roots, "node-public")).toBeUndefined();
    expect(() =>
      validateViewOperation(crdt, member, {
        type: "updateAcl",
        nodeId: "node-public",
        aclPatch: {
          visibility: "public"
        }
      })
    ).toThrow(AccessControlError);
  });

  it("maps preserve-children delete operations back to full document operations", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");

    const fullOperation = putOperation(
      crdt,
      admin,
      {
        type: "deleteNodeKeepChildren",
        nodeId: "node-dev-plan"
      },
      { now: 37 }
    );

    expect(fullOperation).toEqual({
      type: "deleteNodeKeepChildren",
      nodeId: "node-dev-plan",
      actorId: "u-admin",
      timestamp: 37
    });
  });

  it("enforces operation-specific node permissions after admin ACL updates", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");
    const member = user("u-dev-member");
    const guest = user("u-guest");

    const aclOperation = putOperation(
      crdt,
      admin,
      {
        type: "updateAcl",
        nodeId: "node-public",
        aclPatch: {
          visibility: "public",
          allowedRoles: ["admin", "manager", "member", "guest"],
          contentEditableRoles: ["admin", "manager", "member"],
          childAddableRoles: ["admin", "manager", "member"],
          deletableRoles: ["admin"]
        }
      },
      { now: 34 }
    );

    applyFullDocOperation(crdt, aclOperation);

    const memberNode = findViewNode(getView(crdt, member, { now: 35 }).roots, "node-public");
    const guestNode = findViewNode(getView(crdt, guest, { now: 35 }).roots, "node-public");

    expect(memberNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: true,
      canDelete: false,
      canEditAcl: false
    });
    expect(guestNode?.permissions).toMatchObject({
      canRename: false,
      canEditContent: false,
      canAddChild: false,
      canDelete: false,
      canEditAcl: false
    });

    expect(() =>
      validateViewOperation(crdt, member, {
        type: "updateContent",
        nodeId: "node-public",
        content: "研发成员可以修改公共节点内容"
      })
    ).not.toThrow();
    expect(() =>
      validateViewOperation(crdt, member, {
        type: "addNode",
        parentId: "node-public",
        title: "研发成员可添加的子节点"
      })
    ).not.toThrow();
    expect(() =>
      validateViewOperation(crdt, member, {
        type: "deleteNode",
        nodeId: "node-public"
      })
    ).toThrow(AccessControlError);
    expect(() =>
      validateViewOperation(crdt, guest, {
        type: "updateContent",
        nodeId: "node-public",
        content: "访客不能修改"
      })
    ).toThrow(AccessControlError);
  });

  it("uses restricted-path virtual nodes for visible descendants under invisible parents", () => {
    const crdt = createSampleDocument();

    applyFullDocOperation(crdt, {
      type: "addNode",
      parentId: "node-root",
      actorId: "u-admin",
      timestamp: 40,
      node: {
        id: "node-private-folder",
        type: "folder",
        title: "管理员私有目录",
        content: "普通用户不应看到这个目录内容。",
        attrs: {
          department: "finance",
          ownerId: "u-admin",
          tags: ["private"],
          status: "active"
        },
        acl: {
          visibility: "private",
          allowedRoles: ["admin"],
          editableRoles: ["admin"],
          allowedUsers: ["u-admin"],
          deniedUsers: []
        },
        createdBy: "u-admin"
      }
    });
    applyFullDocOperation(crdt, {
      type: "addNode",
      parentId: "node-private-folder",
      actorId: "u-admin",
      timestamp: 41,
      node: {
        id: "node-public-child",
        type: "doc",
        title: "公开子文档",
        content: "虽然父目录受限，但这个子文档公开可见。",
        attrs: {
          department: "all",
          ownerId: "u-admin",
          tags: ["public"],
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

    const adminView = getView(crdt, user("u-admin"), { now: 50 });
    const guestView = getView(crdt, user("u-guest"), { now: 50 });
    const privateFolderForAdmin = findViewNode(adminView.roots, "node-private-folder");
    const restrictedPathForGuest = findVirtualNode(guestView.roots, "restrictedPath");
    const publicChildForGuest = findViewNode(guestView.roots, "node-public-child");

    expect(privateFolderForAdmin).toMatchObject({
      id: "node-private-folder",
      title: "管理员私有目录"
    });
    expect(privateFolderForAdmin?.virtual).not.toBe(true);
    expect(findViewNode(adminView.roots, "node-public-child")).toBeDefined();

    expect(findViewNode(guestView.roots, "node-private-folder")).toBeUndefined();
    expect(JSON.stringify(guestView)).not.toContain("管理员私有目录");
    expect(JSON.stringify(guestView)).not.toContain("普通用户不应看到这个目录内容");
    expect(JSON.stringify(guestView)).not.toContain("finance");

    expect(restrictedPathForGuest).toMatchObject({
      id: "virtual-restricted-node-private-folder",
      title: "受限路径",
      virtual: true,
      virtualReason: "restrictedPath",
      permissions: {
        canAddChild: false,
        canDelete: false,
        canRename: false,
        canEditContent: false,
        canEditAttrs: false,
        canEditAcl: false
      }
    });
    expect(restrictedPathForGuest?.content).toBeUndefined();
    expect(restrictedPathForGuest?.attrs).toBeUndefined();
    expect(publicChildForGuest).toMatchObject({
      id: "node-public-child",
      title: "公开子文档",
      content: "虽然父目录受限，但这个子文档公开可见。"
    });
  });
});

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

function findVirtualNode(
  nodes: ViewNode[],
  reason: NonNullable<ViewNode["virtualReason"]>
): ViewNode | undefined {
  for (const node of nodes) {
    if (node.virtual && node.virtualReason === reason) {
      return node;
    }
    const child = findVirtualNode(node.children, reason);
    if (child) {
      return child;
    }
  }
  return undefined;
}
