import type { NewTreeNode, UserId, UserRole } from "../types";
import { addNode } from "../crdt/operations";
import { type CrdtDocument, createCrdtDocument } from "../crdt/document";

export interface SampleUser {
  id: UserId;
  name: string;
  role: UserRole;
  department: string;
}

export const sampleUsers: SampleUser[] = [
  {
    id: "u-admin",
    name: "管理员",
    role: "admin",
    department: "all"
  },
  {
    id: "u-dev-manager",
    name: "研发组长",
    role: "manager",
    department: "dev"
  },
  {
    id: "u-dev-member",
    name: "研发成员",
    role: "member",
    department: "dev"
  },
  {
    id: "u-guest",
    name: "访客",
    role: "guest",
    department: "external"
  }
];

export function createSampleDocument(now = 1_700_000_000_000): CrdtDocument {
  const crdt = createCrdtDocument({
    docId: "doc-sample",
    title: "项目协同文档",
    now
  });

  // ── Root ────────────────────────────────────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: null,
    node: createNode({
      id: "node-root",
      type: "folder",
      title: "项目空间",
      department: "all",
      ownerId: "u-admin",
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      editableRoles: ["admin"],
      contentEditableRoles: ["admin"],
      childAddableRoles: ["admin"],
      deletableRoles: ["admin"],
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  // ── Public node (visible to everyone) ───────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-public",
      type: "doc",
      title: "公开说明",
      content: "所有用户可见的项目说明。",
      department: "all",
      ownerId: "u-admin",
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  // ── Dev group nodes ──────────────────────────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-plan",
      type: "doc",
      title: "研发计划",
      content: "研发部门项目计划。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-dev-manager"],
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  addNode(crdt, {
    type: "addNode",
    parentId: "node-dev-plan",
    node: createNode({
      id: "node-module-a",
      type: "task",
      title: "模块 A 设计",
      content: "模块 A 的详细设计。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-dev-manager"],
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-requirements",
      type: "doc",
      title: "研发组需求文档",
      content: "研发组功能需求与接口规格。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager"],
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  // ── Finance node (restricted, admin-only) ────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-finance",
      type: "doc",
      title: "财务预算",
      content: "财务敏感预算。",
      department: "finance",
      ownerId: "u-finance",
      visibility: "restricted",
      allowedRoles: ["admin"],
      editableRoles: ["admin"],
      contentEditableRoles: ["admin"],
      childAddableRoles: ["admin"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-finance"],
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  return crdt;
}

// ── Helper ───────────────────────────────────────────────────────────────────

interface CreateNodeInput {
  id: string;
  type: NewTreeNode["type"];
  title: string;
  content?: string;
  department: string;
  ownerId: string;
  visibility: NewTreeNode["acl"]["visibility"];
  allowedRoles: NewTreeNode["acl"]["allowedRoles"];
  editableRoles: NewTreeNode["acl"]["editableRoles"];
  contentEditableRoles?: NewTreeNode["acl"]["contentEditableRoles"];
  childAddableRoles?: NewTreeNode["acl"]["childAddableRoles"];
  deletableRoles?: NewTreeNode["acl"]["deletableRoles"];
  allowedUsers?: string[];
  deniedUsers?: string[];
  createdBy: string;
}

function createNode(input: CreateNodeInput): NewTreeNode {
  return {
    id: input.id,
    type: input.type,
    title: input.title,
    content: input.content ?? "",
    attrs: {
      department: input.department,
      ownerId: input.ownerId,
      tags: [],
      status: "active"
    },
    acl: {
      visibility: input.visibility,
      allowedRoles: input.allowedRoles,
      editableRoles: input.editableRoles,
      contentEditableRoles: input.contentEditableRoles ?? input.editableRoles,
      childAddableRoles: input.childAddableRoles ?? input.editableRoles,
      deletableRoles: input.deletableRoles ?? input.editableRoles,
      allowedUsers: input.allowedUsers ?? [],
      deniedUsers: input.deniedUsers ?? []
    },
    createdBy: input.createdBy
  };
}
