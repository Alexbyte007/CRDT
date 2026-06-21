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
      "node-public-announcement-task",
      "node-public-training-task",
      "node-dev-plan",
      "node-module-a",
      "node-offline-sync-task",
      "node-privacy-view-task",
      "node-delete-conflict-task",
      "node-doc-cleanup-task",
      "node-dev-requirements",
      "node-requirement-review-task",
      "node-api-spec-task",
      "node-frontend-module",
      "node-tree-editing-task",
      "node-operation-log-task",
      "node-finance",
      "node-finance-budget-review-task",
      "node-finance-cost-control-task"
    ]);
    expect(flattenIds(managerView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-public-announcement-task",
      "node-public-training-task",
      "node-dev-plan",
      "node-module-a",
      "node-offline-sync-task",
      "node-privacy-view-task",
      "node-delete-conflict-task",
      "node-doc-cleanup-task",
      "node-dev-requirements",
      "node-requirement-review-task",
      "node-api-spec-task",
      "node-frontend-module",
      "node-tree-editing-task",
      "node-operation-log-task"
    ]);
    expect(flattenIds(memberView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-public-announcement-task",
      "node-public-training-task",
      "node-dev-plan",
      "node-offline-sync-task",
      "node-privacy-view-task",
      "node-delete-conflict-task",
      "node-doc-cleanup-task",
      "node-dev-requirements",
      "node-requirement-review-task",
      "node-api-spec-task",
      "node-frontend-module",
      "node-tree-editing-task",
      "node-operation-log-task"
    ]);
    expect(flattenIds(guestView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-public-announcement-task",
      "node-public-training-task"
    ]);
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
    expect(devPlan?.attrs).not.toHaveProperty("priority");
    expect(devPlan?.attrs).not.toHaveProperty("budget");
    expect(devPlan?.attrs).not.toHaveProperty("taskStatus");
    expect(devPlan?.permissions.canEditPriority).toBe(false);
    expect(devPlan?.permissions.canEditBudget).toBe(false);
    expect(devPlan?.permissions.canEditTaskStatus).toBe(false);
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
      budget: 0,
      department: "dev",
      ownerId: "u-dev-manager",
      priority: "C",
      tags: [],
      status: "active",
      taskStatus: "todo"
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
    expect(parent?.children).toEqual([
      "node-module-a",
      "node-api",
      "node-offline-sync-task",
      "node-privacy-view-task",
      "node-delete-conflict-task",
      "node-doc-cleanup-task"
    ]);
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
      canAddChild: false,
      canDelete: true
    });
    expect(managerNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: false,
      canDelete: true
    });
    expect(adminNode?.permissions).toMatchObject({
      canRename: true,
      canEditContent: true,
      canAddChild: false,
      canDelete: true
    });
    expect(guestNode?.permissions).toMatchObject({
      canRename: false,
      canEditContent: false,
      canAddChild: false,
      canDelete: false
    });
  });

  it("creates first-level child nodes as modules without task-only attrs", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");

    const fullOperation = putOperation(
      crdt,
      admin,
      {
        type: "addNode",
        parentId: "node-root",
        nodeId: "node-new-module",
        title: "新模块",
        content: "一级节点"
      },
      { now: 24 }
    );

    if (fullOperation.type !== "addNode") {
      throw new Error("Expected addNode operation.");
    }

    expect(fullOperation.node.type).toBe("folder");
    expect(fullOperation.node.attrs).toMatchObject({
      department: "all",
      ownerId: "u-admin",
      tags: [],
      status: "active"
    });
    expect(fullOperation.node.attrs).not.toHaveProperty("priority");
    expect(fullOperation.node.attrs).not.toHaveProperty("budget");
    expect(fullOperation.node.attrs).not.toHaveProperty("taskStatus");
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

  it("shows task attrs to visible users and edits them with content permissions", () => {
    const crdt = createSampleDocument();
    const admin = user("u-admin");
    const manager = user("u-dev-manager");
    const member = user("u-dev-member");

    const adminTask = findViewNode(getView(crdt, admin, { now: 31 }).roots, "node-privacy-view-task");
    const managerTask = findViewNode(getView(crdt, manager, { now: 31 }).roots, "node-privacy-view-task");
    const memberTask = findViewNode(getView(crdt, member, { now: 31 }).roots, "node-privacy-view-task");
    const managerModule = findViewNode(getView(crdt, manager, { now: 31 }).roots, "node-dev-plan");

    expect(adminTask?.attrs).toMatchObject({
      priority: "B",
      budget: 4000,
      taskStatus: "todo"
    });
    expect(managerTask?.attrs).toMatchObject({
      priority: "B",
      budget: 4000,
      taskStatus: "todo"
    });
    expect(memberTask?.attrs).toMatchObject({
      priority: "B",
      budget: 4000,
      taskStatus: "todo"
    });
    expect(managerModule?.attrs).not.toHaveProperty("priority");
    expect(managerModule?.attrs).not.toHaveProperty("budget");
    expect(managerModule?.attrs).not.toHaveProperty("taskStatus");
    expect(managerModule?.permissions.canEditPriority).toBe(false);
    expect(managerModule?.permissions.canEditBudget).toBe(false);
    expect(managerModule?.permissions.canEditTaskStatus).toBe(false);

    expect(() =>
      validateViewOperation(crdt, manager, {
        type: "updateAttrs",
        nodeId: "node-dev-plan",
        attrsPatch: {
          priority: "A"
        }
      })
    ).toThrow(AccessControlError);

    const memberAttrUpdate = putOperation(
      crdt,
      member,
      {
        type: "updateAttrs",
        nodeId: "node-privacy-view-task",
        attrsPatch: {
          priority: "A",
          budget: 4300,
          taskStatus: "doing"
        }
      },
      { now: 32 }
    );
    expect(memberAttrUpdate).toMatchObject({
      type: "updateAttrs",
      nodeId: "node-privacy-view-task",
      attrsPatch: {
        priority: "A",
        budget: 4300,
        taskStatus: "doing"
      }
    });

    const managerBudgetUpdate = putOperation(
      crdt,
      manager,
      {
        type: "updateAttrs",
        nodeId: "node-privacy-view-task",
        attrsPatch: {
          priority: "A",
          budget: 4500,
          taskStatus: "doing"
        }
      },
      { now: 33 }
    );
    expect(managerBudgetUpdate).toMatchObject({
      attrsPatch: {
        priority: "A",
        budget: 4500,
        taskStatus: "doing"
      }
    });

    applyFullDocOperation(
      crdt,
      putOperation(
        crdt,
        admin,
        {
          type: "updateAcl",
          nodeId: "node-privacy-view-task",
          aclPatch: {
            contentEditableRoles: ["admin"]
          }
        },
        { now: 34 }
      )
    );

    const restrictedManagerTask = findViewNode(
      getView(crdt, manager, { now: 35 }).roots,
      "node-privacy-view-task"
    );
    expect(restrictedManagerTask?.permissions.canEditPriority).toBe(false);
    expect(restrictedManagerTask?.permissions.canEditBudget).toBe(false);
    expect(restrictedManagerTask?.permissions.canEditTaskStatus).toBe(false);

    expect(() =>
      validateViewOperation(crdt, manager, {
        type: "updateAttrs",
        nodeId: "node-privacy-view-task",
        attrsPatch: {
          budget: 9999
        }
      })
    ).toThrow(AccessControlError);

    expect(() =>
      validateViewOperation(crdt, manager, {
        type: "updateAttrs",
        nodeId: "node-privacy-view-task",
        attrsPatch: {
          taskStatus: "done"
        }
      })
    ).toThrow(AccessControlError);
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
      deletableRoles: ["admin"],
      advancedPermissions: {
        deleteConflictResolverUserIds: []
      }
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

  it("flattens visible descendants under invisible parents to the nearest visible ancestor", () => {
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
          contentEditableRoles: ["admin", "manager", "member", "guest"],
          childAddableRoles: ["admin", "manager", "member", "guest"],
          allowedUsers: [],
          deniedUsers: []
        },
        createdBy: "u-admin"
      }
    });

    const adminView = getView(crdt, user("u-admin"), { now: 50 });
    const guestView = getView(crdt, user("u-guest"), { now: 50 });
    const privateFolderForAdmin = findViewNode(adminView.roots, "node-private-folder");
    const publicChildForGuest = findViewNode(guestView.roots, "node-public-child");

    expect(privateFolderForAdmin).toMatchObject({
      id: "node-private-folder",
      title: "管理员私有目录"
    });
    expect(findViewNode(adminView.roots, "node-public-child")).toMatchObject({
      id: "node-public-child",
      parentId: "node-private-folder"
    });

    expect(findViewNode(guestView.roots, "node-private-folder")).toBeUndefined();
    expect(JSON.stringify(guestView)).not.toContain("管理员私有目录");
    expect(JSON.stringify(guestView)).not.toContain("普通用户不应看到这个目录内容");
    expect(JSON.stringify(guestView)).not.toContain("finance");
    expect(JSON.stringify(guestView)).not.toContain("受限路径");
    expect(JSON.stringify(guestView)).not.toContain("restrictedPath");
    expect(publicChildForGuest).toMatchObject({
      id: "node-public-child",
      parentId: "node-root",
      title: "公开子文档",
      content: "虽然父目录受限，但这个子文档公开可见。"
    });

    const updateOperation = putOperation(
      crdt,
      user("u-guest"),
      {
        type: "updateContent",
        nodeId: "node-public-child",
        content: "普通用户在折叠视图中修改公开子文档。"
      },
      { now: 51 }
    );
    applyFullDocOperation(crdt, updateOperation);
    expect(getNodeSnapshot(crdt, "node-public-child")?.content).toBe(
      "普通用户在折叠视图中修改公开子文档。"
    );

    expect(() =>
      putOperation(
        crdt,
        user("u-guest"),
        {
          type: "addNode",
          parentId: "node-public-child",
          nodeId: "node-public-grandchild",
          title: "公开孙节点"
        },
        { now: 52 }
      )
    ).toThrowError(/at most three levels/i);
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
