import {
  AccessControlError,
  type AddNodeOperation,
  type FullDocOperation,
  type NewTreeNode,
  type NodeAcl,
  type NodeAdvancedPermissions,
  type NodeAttrs,
  type NodeId,
  type TreeNodeSnapshot,
  type User,
  type UserView,
  type ViewNode,
  type ViewOperation,
  type ViewPermissions
} from "../types";
import type { CrdtDocument } from "../crdt/document";
import { getDocumentSnapshot, getNodeSnapshot } from "../crdt/snapshot";
import { defaultPolicyEngine } from "../access-control/default-policy";
import type { PolicyEngine } from "../access-control/policy-engine";

export interface ViewTransformOptions {
  now?: number;
  policyEngine?: PolicyEngine;
}

export function getView(
  crdt: CrdtDocument,
  user: User,
  options: ViewTransformOptions = {}
): UserView {
  const policyEngine = options.policyEngine ?? defaultPolicyEngine;
  const snapshot = getDocumentSnapshot(crdt);
  const roots: ViewNode[] = [];

  for (const rootId of snapshot.rootIds) {
    roots.push(...projectNode(rootId, user, snapshot.nodes, policyEngine, null));
  }

  return {
    userId: user.id,
    docId: snapshot.meta.docId,
    generatedAt: options.now ?? Date.now(),
    roots
  };
}

export function validateViewOperation(
  crdt: CrdtDocument,
  user: User,
  operation: ViewOperation,
  options: ViewTransformOptions = {}
): void {
  const policyEngine = options.policyEngine ?? defaultPolicyEngine;
  const target = getOperationTarget(crdt, operation);

  if (!target) {
    throw new AccessControlError(`Operation target does not exist: ${getTargetId(operation)}`);
  }

  switch (operation.type) {
    case "addNode":
      ensureCanEdit(user, target, "addNode", policyEngine);
      return;
    case "deleteNode":
      ensureCanEdit(user, target, "deleteNode", policyEngine);
      return;
    case "deleteNodeKeepChildren":
      ensureCanEdit(user, target, "deleteNodeKeepChildren", policyEngine);
      return;
    case "renameNode":
      ensureCanEdit(user, target, "renameNode", policyEngine);
      return;
    case "updateContent":
      ensureCanEdit(user, target, "updateContent", policyEngine);
      return;
    case "updateAttrs": {
      ensureCanEdit(user, target, "updateAttrs", policyEngine);
      const sanitized = policyEngine.sanitizeAttrsPatch(user, target, operation.attrsPatch);
      if (Object.keys(operation.attrsPatch).length > 0 && Object.keys(sanitized).length === 0) {
        throw new AccessControlError("No attrs in this patch are editable by the current user.");
      }
      return;
    }
    case "updateAcl":
      ensureCanEdit(user, target, "updateAcl", policyEngine);
      sanitizeAclPatch(operation.aclPatch);
      return;
    default:
      assertNever(operation);
  }
}

export function putOperation(
  crdt: CrdtDocument,
  user: User,
  operation: ViewOperation,
  options: ViewTransformOptions = {}
): FullDocOperation {
  const policyEngine = options.policyEngine ?? defaultPolicyEngine;
  validateViewOperation(crdt, user, operation, options);

  const timestamp = options.now ?? Date.now();

  switch (operation.type) {
    case "addNode":
      return buildFullAddNodeOperation(crdt, user, operation, timestamp, policyEngine);
    case "deleteNode":
      return {
        type: "deleteNode",
        nodeId: operation.nodeId,
        actorId: user.id,
        timestamp
      };
    case "deleteNodeKeepChildren":
      return {
        type: "deleteNodeKeepChildren",
        nodeId: operation.nodeId,
        actorId: user.id,
        timestamp
      };
    case "renameNode":
      return {
        type: "renameNode",
        nodeId: operation.nodeId,
        title: operation.title,
        actorId: user.id,
        timestamp
      };
    case "updateContent":
      return {
        type: "updateContent",
        nodeId: operation.nodeId,
        content: operation.content,
        actorId: user.id,
        timestamp
      };
    case "updateAttrs": {
      const node = requireSnapshot(crdt, operation.nodeId);
      const attrsPatch = policyEngine.sanitizeAttrsPatch(user, node, operation.attrsPatch);
      return {
        type: "updateAttrs",
        nodeId: operation.nodeId,
        attrsPatch,
        actorId: user.id,
        timestamp
      };
    }
    case "updateAcl":
      return {
        type: "updateAcl",
        nodeId: operation.nodeId,
        aclPatch: sanitizeAclPatch(operation.aclPatch),
        actorId: user.id,
        timestamp
      };
    default:
      assertNever(operation);
  }
}

function projectNode(
  nodeId: NodeId,
  user: User,
  nodes: Record<NodeId, TreeNodeSnapshot>,
  policyEngine: PolicyEngine,
  projectedParentId: NodeId | null
): ViewNode[] {
  const node = nodes[nodeId];

  if (!node) {
    return [];
  }

  const canView = policyEngine.canViewNode(user, node);
  const children = projectChildren(
    node,
    user,
    nodes,
    policyEngine,
    canView ? node.id : projectedParentId
  );

  if (!canView) {
    return children;
  }

  const viewNode: ViewNode = {
    id: node.id,
    parentId: projectedParentId,
    type: node.type,
    title: node.title,
    children,
    permissions: buildViewPermissions(user, node, policyEngine)
  };

  if (policyEngine.canViewField(user, node, "content")) {
    viewNode.content = node.content;
  }

  const attrs = sanitizeNodeAttrs(user, node, policyEngine);
  if (Object.keys(attrs).length > 0) {
    viewNode.attrs = attrs;
  }

  if (policyEngine.canEditNode(user, node, "updateAcl")) {
    viewNode.acl = {
      visibility: node.acl.visibility,
      allowedRoles: node.acl.allowedRoles,
      contentEditableRoles: node.acl.contentEditableRoles ?? node.acl.editableRoles,
      childAddableRoles: node.acl.childAddableRoles ?? node.acl.editableRoles,
      deletableRoles: node.acl.deletableRoles ?? node.acl.editableRoles,
      advancedPermissions: normalizeAdvancedPermissions(node.acl.advancedPermissions)
    };
  }

  return [viewNode];
}

function projectChildren(
  node: TreeNodeSnapshot,
  user: User,
  nodes: Record<NodeId, TreeNodeSnapshot>,
  policyEngine: PolicyEngine,
  projectedParentId: NodeId | null
): ViewNode[] {
  const children: ViewNode[] = [];

  for (const childId of node.children) {
    children.push(...projectNode(childId, user, nodes, policyEngine, projectedParentId));
  }

  return children;
}

function sanitizeNodeAttrs(
  user: User,
  node: TreeNodeSnapshot,
  policyEngine: PolicyEngine
): Partial<NodeAttrs> {
  const attrs: Partial<NodeAttrs> = {};

  for (const key of Object.keys(node.attrs) as Array<keyof NodeAttrs>) {
    if (policyEngine.canViewField(user, node, `attrs.${key}`)) {
      Object.assign(attrs, { [key]: node.attrs[key] });
    }
  }

  return attrs;
}

function buildViewPermissions(
  user: User,
  node: TreeNodeSnapshot,
  policyEngine: PolicyEngine
): ViewPermissions {
  return {
    canAddChild: policyEngine.canEditNode(user, node, "addNode"),
    canDelete: policyEngine.canEditNode(user, node, "deleteNode"),
    canRename: policyEngine.canEditNode(user, node, "renameNode"),
    canEditContent: policyEngine.canEditNode(user, node, "updateContent"),
    canEditAttrs: policyEngine.canEditNode(user, node, "updateAttrs"),
    canEditAcl: policyEngine.canEditNode(user, node, "updateAcl")
  };
}

function sanitizeAclPatch(
  aclPatch: Pick<
    Partial<NodeAcl>,
    | "visibility"
    | "allowedRoles"
    | "contentEditableRoles"
    | "childAddableRoles"
    | "deletableRoles"
    | "advancedPermissions"
  >
): Pick<
  Partial<NodeAcl>,
  | "visibility"
  | "allowedRoles"
  | "contentEditableRoles"
  | "childAddableRoles"
  | "deletableRoles"
  | "advancedPermissions"
> {
  const result: Pick<
    Partial<NodeAcl>,
    | "visibility"
    | "allowedRoles"
    | "contentEditableRoles"
    | "childAddableRoles"
    | "deletableRoles"
    | "advancedPermissions"
  > = {};
  if (aclPatch.visibility !== undefined) {
    if (!["public", "department", "private", "restricted"].includes(aclPatch.visibility)) {
      throw new AccessControlError(`Unsupported node visibility: ${aclPatch.visibility}`);
    }
    result.visibility = aclPatch.visibility;
  }
  for (const key of ["allowedRoles", "contentEditableRoles", "childAddableRoles", "deletableRoles"] as const) {
    if (aclPatch[key] !== undefined) {
      result[key] = sanitizeRoleList(aclPatch[key], key);
    }
  }
  if (aclPatch.advancedPermissions !== undefined) {
    result.advancedPermissions = sanitizeAdvancedPermissions(aclPatch.advancedPermissions);
  }
  return result;
}

function sanitizeRoleList(value: unknown, field: string): Array<"admin" | "manager" | "member" | "guest"> {
  if (!Array.isArray(value)) {
    throw new AccessControlError(`${field} must be an array.`);
  }
  for (const role of value) {
    if (!["admin", "manager", "member", "guest"].includes(role)) {
      throw new AccessControlError(`Unsupported role in ${field}: ${role}`);
    }
  }
  return value;
}

function sanitizeAdvancedPermissions(value: unknown): NodeAdvancedPermissions {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AccessControlError("advancedPermissions must be an object.");
  }

  const input = value as Record<string, unknown>;
  return {
    deleteConflictResolverUserIds: sanitizeUserIdList(
      input.deleteConflictResolverUserIds,
      "advancedPermissions.deleteConflictResolverUserIds"
    )
  };
}

function normalizeAdvancedPermissions(value: NodeAdvancedPermissions | undefined): NodeAdvancedPermissions {
  return {
    deleteConflictResolverUserIds: value?.deleteConflictResolverUserIds ?? []
  };
}

function sanitizeUserIdList(value: unknown, field: string): string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new AccessControlError(`${field} must be an array.`);
  }

  const userIds: string[] = [];
  for (const userId of value) {
    if (typeof userId !== "string" || userId.trim().length === 0) {
      throw new AccessControlError(`${field} must contain non-empty user ids.`);
    }
    if (!userIds.includes(userId)) {
      userIds.push(userId);
    }
  }
  return userIds;
}

function getOperationTarget(
  crdt: CrdtDocument,
  operation: ViewOperation
): TreeNodeSnapshot | undefined {
  if (operation.type === "addNode") {
    return getNodeSnapshot(crdt, operation.parentId);
  }
  return getNodeSnapshot(crdt, operation.nodeId);
}

function getTargetId(operation: ViewOperation): NodeId {
  return operation.type === "addNode" ? operation.parentId : operation.nodeId;
}

function ensureCanEdit(
  user: User,
  node: TreeNodeSnapshot,
  operationType: FullDocOperation["type"],
  policyEngine: PolicyEngine
): void {
  if (!policyEngine.canEditNode(user, node, operationType)) {
    throw new AccessControlError(
      `User ${user.id} is not allowed to ${operationType} on node ${node.id}.`
    );
  }
}

function buildFullAddNodeOperation(
  crdt: CrdtDocument,
  user: User,
  operation: Extract<ViewOperation, { type: "addNode" }>,
  timestamp: number,
  policyEngine: PolicyEngine
): AddNodeOperation {
  const parent = requireSnapshot(crdt, operation.parentId);
  const defaults = policyEngine.getAddNodeDefaults();
  const creatorAndHigherRoles = rolesAtOrAbove(user.role);
  const node: NewTreeNode = {
    id: operation.nodeId ?? createNodeId(user.id, timestamp),
    type: defaults.type,
    title: operation.title,
    content: operation.content ?? "",
    attrs: {
      department: resolveDepartmentDefault(defaults.department, parent),
      ownerId: resolveOwnerDefault(defaults.ownerId, user),
      tags: [],
      status: defaults.status
    },
    acl: {
      visibility: resolveVisibilityDefault(defaults.visibility, parent),
      allowedRoles: resolveVisibleRoleListDefault(defaults.allowedRoles, parent.acl.allowedRoles),
      editableRoles: resolveOperationRoleListDefault(defaults.editableRoles, parent.acl.editableRoles, creatorAndHigherRoles),
      contentEditableRoles: resolveOperationRoleListDefault(
        defaults.editableRoles,
        parent.acl.contentEditableRoles ?? parent.acl.editableRoles,
        creatorAndHigherRoles
      ),
      childAddableRoles: resolveOperationRoleListDefault(
        defaults.editableRoles,
        parent.acl.childAddableRoles ?? parent.acl.editableRoles,
        creatorAndHigherRoles
      ),
      deletableRoles: resolveOperationRoleListDefault(
        defaults.editableRoles,
        parent.acl.deletableRoles ?? parent.acl.editableRoles,
        creatorAndHigherRoles
      ),
      allowedUsers: resolveAllowedUsersDefault(defaults.allowedUsers, user),
      deniedUsers: []
    },
    createdBy: user.id
  };

  return {
    type: "addNode",
    parentId: operation.parentId,
    node,
    index: operation.index,
    actorId: user.id,
    timestamp
  };
}

function resolveDepartmentDefault(value: "inherit-parent", parent: TreeNodeSnapshot): string {
  return value === "inherit-parent" ? parent.attrs.department : value;
}

function resolveOwnerDefault(value: "current-user", user: User): string {
  return value === "current-user" ? user.id : value;
}

function resolveVisibilityDefault(
  value: "inherit-parent",
  parent: TreeNodeSnapshot
): TreeNodeSnapshot["acl"]["visibility"] {
  return value === "inherit-parent" ? parent.acl.visibility : value;
}

function resolveVisibleRoleListDefault(
  value: "inherit-parent",
  parentValue: TreeNodeSnapshot["acl"]["allowedRoles"]
): TreeNodeSnapshot["acl"]["allowedRoles"] {
  return value === "inherit-parent" ? parentValue : parentValue;
}

function resolveOperationRoleListDefault(
  value: "inherit-parent",
  parentValue: TreeNodeSnapshot["acl"]["allowedRoles"],
  creatorAndHigherRoles: TreeNodeSnapshot["acl"]["allowedRoles"]
): TreeNodeSnapshot["acl"]["allowedRoles"] {
  return value === "inherit-parent" ? creatorAndHigherRoles : parentValue;
}

function resolveAllowedUsersDefault(value: "current-user", user: User): string[] {
  return value === "current-user" ? [user.id] : [user.id];
}

function rolesAtOrAbove(role: User["role"]): TreeNodeSnapshot["acl"]["allowedRoles"] {
  switch (role) {
    case "admin":
      return ["admin"];
    case "manager":
      return ["admin", "manager"];
    case "member":
      return ["admin", "manager", "member"];
    case "guest":
      return ["admin", "manager", "member", "guest"];
    default:
      return assertNever(role);
  }
}

function requireSnapshot(crdt: CrdtDocument, nodeId: NodeId): TreeNodeSnapshot {
  const node = getNodeSnapshot(crdt, nodeId);
  if (!node) {
    throw new AccessControlError(`Node does not exist: ${nodeId}`);
  }
  return node;
}

function createNodeId(userId: string, timestamp: number): NodeId {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return `node-${safeUserId}-${timestamp}`;
}

function assertNever(value: never): never {
  throw new AccessControlError(`Unsupported view operation: ${JSON.stringify(value)}`);
}
