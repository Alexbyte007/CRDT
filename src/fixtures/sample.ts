import type { NewTreeNode, User } from "../types";
import { addNode, deleteNode } from "../crdt/operations";
import { type CrdtDocument, createCrdtDocument } from "../crdt/document";
import { getNodeSnapshot } from "../crdt/snapshot";

const SAMPLE_USER_CREATED_AT = 1_700_000_000_000;

export const sampleUserAccountSeeds = [
  {
    id: "u-admin",
    username: "admin",
    name: "管理员",
    role: "admin",
    department: "all",
    password: "admin123"
  },
  {
    id: "u-dev-manager",
    username: "manager",
    name: "研发经理",
    role: "manager",
    department: "dev",
    password: "manager123"
  },
  {
    id: "u-dev-member",
    username: "member",
    name: "研发人员",
    role: "member",
    department: "dev",
    password: "member123"
  },
  {
    id: "u-guest",
    username: "guest",
    name: "访客",
    role: "guest",
    department: "external",
    password: "guest123"
  }
] as const;

export const sampleUsers: User[] = sampleUserAccountSeeds.map(
  ({ id, username, name, role, department }, index) => ({
    id,
    username,
    name,
    role,
    department,
    createdAt: SAMPLE_USER_CREATED_AT + index
  })
);

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

  // ── Public module (visible to everyone) ─────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-public",
      type: "task",
      title: "项目公告模块",
      content: "所有用户可见的公告、培训和汇报工作包。",
      department: "all",
      ownerId: "u-admin",
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      attrsPatch: {
        priority: "A",
        budget: 3000,
        taskStatus: "doing"
      },
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });
  addPublicModuleTaskSamples(crdt, now);

  // ── Dev group nodes ──────────────────────────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-plan",
      type: "task",
      title: "权限与隐私模块",
      content: "研发部门权限、隐私视图和离线协同相关工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-dev-manager"],
      attrsPatch: {
        priority: "A",
        budget: 24000,
        taskStatus: "doing"
      },
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
      title: "登录注册任务",
      content: "完善账号密码登录、注册和管理员身份管理。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-dev-manager"],
      attrsPatch: {
        priority: "A",
        budget: 5000,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  for (const task of [
    {
      id: "node-offline-sync-task",
      title: "离线同步任务",
      content: "完善离线队列、心跳检测和重连后的批量同步。",
      priority: "A",
      budget: 8000,
      taskStatus: "doing"
    },
    {
      id: "node-privacy-view-task",
      title: "权限视图任务",
      content: "实现不同角色下的隐私视图投影和字段过滤。",
      priority: "B",
      budget: 4000,
      taskStatus: "todo"
    },
    {
      id: "node-delete-conflict-task",
      title: "删除冲突任务",
      content: "处理父节点删除时对子节点可见性的影响分析。",
      priority: "B",
      budget: 6000,
      taskStatus: "todo"
    },
    {
      id: "node-doc-cleanup-task",
      title: "文档整理任务",
      content: "整理汇报材料和演示说明。",
      priority: "C",
      budget: 1000,
      taskStatus: "done"
    }
  ] as const) {
    addNode(crdt, {
      type: "addNode",
      parentId: "node-dev-plan",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "dev",
        ownerId: "u-dev-manager",
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"],
        editableRoles: ["admin", "manager", "member"],
        contentEditableRoles: ["admin", "manager", "member"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin", "manager"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-dev-manager"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }

  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-requirements",
      type: "task",
      title: "需求管理模块",
      content: "研发组功能需求、接口规格和评审工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager"],
      attrsPatch: {
        priority: "A",
        budget: 6300,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });
  addRequirementModuleTaskSamples(crdt, now);

  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-frontend-module",
      type: "task",
      title: "前端交互模块",
      content: "树形编辑、操作日志和用户交互相关工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager"],
      attrsPatch: {
        priority: "B",
        budget: 4500,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  for (const task of [
    {
      id: "node-tree-editing-task",
      title: "树形编辑优化",
      content: "在项目树中直接完成节点增删改和权限感知显示。",
      priority: "B",
      budget: 3000,
      taskStatus: "doing"
    },
    {
      id: "node-operation-log-task",
      title: "操作日志展示",
      content: "展示本地操作、远端同步和失败原因。",
      priority: "C",
      budget: 1500,
      taskStatus: "done"
    }
  ] as const) {
    addNode(crdt, {
      type: "addNode",
      parentId: "node-frontend-module",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "dev",
        ownerId: "u-dev-manager",
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"],
        editableRoles: ["admin", "manager", "member"],
        contentEditableRoles: ["admin", "manager", "member"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin", "manager"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-dev-manager"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }

  // ── Finance node (restricted, admin-only) ────────────────────────────────────
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-finance",
      type: "task",
      title: "预算审批模块",
      content: "管理员可见的预算审批和成本复核工作包。",
      department: "finance",
      ownerId: "u-finance",
      visibility: "restricted",
      allowedRoles: ["admin"],
      editableRoles: ["admin"],
      contentEditableRoles: ["admin"],
      childAddableRoles: ["admin"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-finance"],
      attrsPatch: {
        priority: "A",
        budget: 14000,
        taskStatus: "todo"
      },
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });
  addFinanceModuleTaskSamples(crdt, now);

  return crdt;
}

export function ensureTaskAttributeSampleData(crdt: CrdtDocument, now = Date.now()): boolean {
  let changed = false;
  const root = getNodeSnapshot(crdt, "node-root");
  if (!root) {
    return false;
  }

  for (const legacyNodeId of ["node-dev-cost-table", "node-task-progress-table"]) {
    if (getNodeSnapshot(crdt, legacyNodeId)) {
      deleteNode(crdt, {
        type: "deleteNode",
        nodeId: legacyNodeId,
        actorId: "u-admin",
        timestamp: now
      });
      changed = true;
    }
  }

  if (!nodeExistsOrDeleted(crdt, "node-public")) {
    addPublicModule(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-dev-plan")) {
    addDevPlanModule(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-dev-requirements")) {
    addRequirementModule(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-finance")) {
    addFinanceModule(crdt, now);
    changed = true;
  }

  if (!getNodeSnapshot(crdt, "node-offline-sync-task") && getNodeSnapshot(crdt, "node-dev-plan")) {
    addDevPlanTaskSamples(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-public-announcement-task") && getNodeSnapshot(crdt, "node-public")) {
    addPublicModuleTaskSamples(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-requirement-review-task") && getNodeSnapshot(crdt, "node-dev-requirements")) {
    addRequirementModuleTaskSamples(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-frontend-module")) {
    addFrontendModuleSamples(crdt, now);
    changed = true;
  } else if (!nodeExistsOrDeleted(crdt, "node-tree-editing-task")) {
    addFrontendModuleTaskSamples(crdt, now);
    changed = true;
  }

  if (!nodeExistsOrDeleted(crdt, "node-finance-budget-review-task") && getNodeSnapshot(crdt, "node-finance")) {
    addFinanceModuleTaskSamples(crdt, now);
    changed = true;
  }

  return changed;
}

function nodeExistsOrDeleted(crdt: CrdtDocument, nodeId: string): boolean {
  return Boolean(getNodeSnapshot(crdt, nodeId) || crdt.tombstones.has(nodeId));
}

function addPublicModule(crdt: CrdtDocument, now: number): void {
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-public",
      type: "task",
      title: "项目公告模块",
      content: "所有用户可见的公告、培训和汇报工作包。",
      department: "all",
      ownerId: "u-admin",
      visibility: "public",
      allowedRoles: ["admin", "manager", "member", "guest"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      attrsPatch: {
        priority: "A",
        budget: 3000,
        taskStatus: "doing"
      },
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });
}

function addDevPlanModule(crdt: CrdtDocument, now: number): void {
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-plan",
      type: "task",
      title: "权限与隐私模块",
      content: "研发部门权限、隐私视图和离线协同相关工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager"],
      contentEditableRoles: ["admin", "manager"],
      childAddableRoles: ["admin", "manager"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-dev-manager"],
      attrsPatch: {
        priority: "A",
        budget: 24000,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });
}

function addRequirementModule(crdt: CrdtDocument, now: number): void {
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-dev-requirements",
      type: "task",
      title: "需求管理模块",
      content: "研发组功能需求、接口规格和评审工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager"],
      attrsPatch: {
        priority: "A",
        budget: 6300,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });
}

function addFinanceModule(crdt: CrdtDocument, now: number): void {
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-finance",
      type: "task",
      title: "预算审批模块",
      content: "管理员可见的预算审批和成本复核工作包。",
      department: "finance",
      ownerId: "u-finance",
      visibility: "restricted",
      allowedRoles: ["admin"],
      editableRoles: ["admin"],
      contentEditableRoles: ["admin"],
      childAddableRoles: ["admin"],
      deletableRoles: ["admin"],
      allowedUsers: ["u-finance"],
      attrsPatch: {
        priority: "A",
        budget: 14000,
        taskStatus: "todo"
      },
      createdBy: "u-admin"
    }),
    actorId: "u-admin",
    timestamp: now
  });
}

function addPublicModuleTaskSamples(crdt: CrdtDocument, now: number): void {
  for (const task of [
    {
      id: "node-public-announcement-task",
      title: "项目公告发布",
      content: "发布项目范围、演示入口和账号说明。",
      priority: "A",
      budget: 1200,
      taskStatus: "done"
    },
    {
      id: "node-public-training-task",
      title: "协同使用培训",
      content: "面向访客和研发成员的协同编辑使用说明。",
      priority: "B",
      budget: 1800,
      taskStatus: "doing"
    }
  ] as const) {
    if (getNodeSnapshot(crdt, task.id)) {
      continue;
    }
    addNode(crdt, {
      type: "addNode",
      parentId: "node-public",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "all",
        ownerId: "u-admin",
        visibility: "public",
        allowedRoles: ["admin", "manager", "member", "guest"],
        editableRoles: ["admin", "manager"],
        contentEditableRoles: ["admin", "manager"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-admin"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }
}

function addRequirementModuleTaskSamples(crdt: CrdtDocument, now: number): void {
  for (const task of [
    {
      id: "node-requirement-review-task",
      title: "需求评审任务",
      content: "梳理协同编辑的权限、离线和冲突需求。",
      priority: "A",
      budget: 3500,
      taskStatus: "doing"
    },
    {
      id: "node-api-spec-task",
      title: "接口规格任务",
      content: "整理登录、节点操作、批量同步和删除影响接口。",
      priority: "B",
      budget: 2800,
      taskStatus: "todo"
    }
  ] as const) {
    if (getNodeSnapshot(crdt, task.id)) {
      continue;
    }
    addNode(crdt, {
      type: "addNode",
      parentId: "node-dev-requirements",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "dev",
        ownerId: "u-dev-manager",
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"],
        editableRoles: ["admin", "manager", "member"],
        contentEditableRoles: ["admin", "manager", "member"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin", "manager"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-dev-manager"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }
}

function addFinanceModuleTaskSamples(crdt: CrdtDocument, now: number): void {
  for (const task of [
    {
      id: "node-finance-budget-review-task",
      title: "预算复核任务",
      content: "复核各模块任务预算和总预算风险。",
      priority: "A",
      budget: 9000,
      taskStatus: "todo"
    },
    {
      id: "node-finance-cost-control-task",
      title: "成本控制任务",
      content: "管理员确认预算调整和成本控制策略。",
      priority: "B",
      budget: 5000,
      taskStatus: "doing"
    }
  ] as const) {
    if (getNodeSnapshot(crdt, task.id)) {
      continue;
    }
    addNode(crdt, {
      type: "addNode",
      parentId: "node-finance",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "finance",
        ownerId: "u-finance",
        visibility: "restricted",
        allowedRoles: ["admin"],
        editableRoles: ["admin"],
        contentEditableRoles: ["admin"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin"],
        allowedUsers: ["u-finance"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-admin"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }
}

function addDevPlanTaskSamples(crdt: CrdtDocument, now: number): void {
  for (const task of [
    {
      id: "node-offline-sync-task",
      title: "离线同步任务",
      content: "完善离线队列、心跳检测和重连后的批量同步。",
      priority: "A",
      budget: 8000,
      taskStatus: "doing"
    },
    {
      id: "node-privacy-view-task",
      title: "权限视图任务",
      content: "实现不同角色下的隐私视图投影和字段过滤。",
      priority: "B",
      budget: 4000,
      taskStatus: "todo"
    },
    {
      id: "node-delete-conflict-task",
      title: "删除冲突任务",
      content: "处理父节点删除时对子节点可见性的影响分析。",
      priority: "B",
      budget: 6000,
      taskStatus: "todo"
    },
    {
      id: "node-doc-cleanup-task",
      title: "文档整理任务",
      content: "整理汇报材料和演示说明。",
      priority: "C",
      budget: 1000,
      taskStatus: "done"
    }
  ] as const) {
    if (getNodeSnapshot(crdt, task.id)) {
      continue;
    }
    addNode(crdt, {
      type: "addNode",
      parentId: "node-dev-plan",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "dev",
        ownerId: "u-dev-manager",
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"],
        editableRoles: ["admin", "manager", "member"],
        contentEditableRoles: ["admin", "manager", "member"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin", "manager"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-dev-manager"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }
}

function addFrontendModuleSamples(crdt: CrdtDocument, now: number): void {
  addNode(crdt, {
    type: "addNode",
    parentId: "node-root",
    node: createNode({
      id: "node-frontend-module",
      type: "task",
      title: "前端交互模块",
      content: "树形编辑、操作日志和用户交互相关工作包。",
      department: "dev",
      ownerId: "u-dev-manager",
      visibility: "department",
      allowedRoles: ["admin", "manager", "member"],
      editableRoles: ["admin", "manager", "member"],
      contentEditableRoles: ["admin", "manager", "member"],
      childAddableRoles: ["admin", "manager", "member"],
      deletableRoles: ["admin", "manager"],
      attrsPatch: {
        priority: "B",
        budget: 4500,
        taskStatus: "doing"
      },
      createdBy: "u-dev-manager"
    }),
    actorId: "u-admin",
    timestamp: now
  });

  addFrontendModuleTaskSamples(crdt, now);
}

function addFrontendModuleTaskSamples(crdt: CrdtDocument, now: number): void {
  for (const task of [
    {
      id: "node-tree-editing-task",
      title: "树形编辑优化",
      content: "在项目树中直接完成节点增删改和权限感知显示。",
      priority: "B",
      budget: 3000,
      taskStatus: "doing"
    },
    {
      id: "node-operation-log-task",
      title: "操作日志展示",
      content: "展示本地操作、远端同步和失败原因。",
      priority: "C",
      budget: 1500,
      taskStatus: "done"
    }
  ] as const) {
    if (getNodeSnapshot(crdt, task.id)) {
      continue;
    }
    addNode(crdt, {
      type: "addNode",
      parentId: "node-frontend-module",
      node: createNode({
        id: task.id,
        type: "task",
        title: task.title,
        content: task.content,
        department: "dev",
        ownerId: "u-dev-manager",
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"],
        editableRoles: ["admin", "manager", "member"],
        contentEditableRoles: ["admin", "manager", "member"],
        childAddableRoles: ["admin"],
        deletableRoles: ["admin", "manager"],
        attrsPatch: {
          priority: task.priority,
          budget: task.budget,
          taskStatus: task.taskStatus
        },
        createdBy: "u-dev-manager"
      }),
      actorId: "u-admin",
      timestamp: now
    });
  }
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
  attributeEditableRoles?: NewTreeNode["acl"]["attributeEditableRoles"];
  allowedUsers?: string[];
  deniedUsers?: string[];
  attrsPatch?: Partial<NewTreeNode["attrs"]>;
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
      status: "active",
      priority: "C",
      budget: 0,
      taskStatus: "todo",
      ...input.attrsPatch
    },
    acl: {
      visibility: input.visibility,
      allowedRoles: input.allowedRoles,
      editableRoles: input.editableRoles,
      contentEditableRoles: input.contentEditableRoles ?? input.editableRoles,
      childAddableRoles: input.childAddableRoles ?? input.editableRoles,
      deletableRoles: input.deletableRoles ?? input.editableRoles,
      attributeEditableRoles: input.attributeEditableRoles ?? input.editableRoles,
      allowedUsers: input.allowedUsers ?? [],
      deniedUsers: input.deniedUsers ?? []
    },
    createdBy: input.createdBy
  };
}
