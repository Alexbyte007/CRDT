import {
  AccessControlError,
  type AddNodeOperation,
  type FullDocOperation,
  type NewTreeNode,
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
    const viewRoot = projectNode(rootId, user, snapshot.nodes, policyEngine);
    if (viewRoot) {
      roots.push(viewRoot);
    }
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
    default:
      assertNever(operation);
  }
}

function projectNode(
  nodeId: NodeId,
  user: User,
  nodes: Record<NodeId, TreeNodeSnapshot>,
  policyEngine: PolicyEngine
): ViewNode | null {
  const node = nodes[nodeId];

  if (!node || !policyEngine.canViewNode(user, node)) {
    return null;
  }

  const viewNode: ViewNode = {
    id: node.id,
    parentId: node.parentId,
    type: node.type,
    title: node.title,
    children: [],
    permissions: buildViewPermissions(user, node, policyEngine)
  };

  if (policyEngine.canViewField(user, node, "content")) {
    viewNode.content = node.content;
  }

  const attrs = sanitizeNodeAttrs(user, node, policyEngine);
  if (Object.keys(attrs).length > 0) {
    viewNode.attrs = attrs;
  }

  for (const childId of node.children) {
    const childView = projectNode(childId, user, nodes, policyEngine);
    if (childView) {
      viewNode.children.push(childView);
    }
  }

  return viewNode;
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
    canEditAttrs: policyEngine.canEditNode(user, node, "updateAttrs")
  };
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
      allowedRoles: resolveRoleListDefault(defaults.allowedRoles, parent.acl.allowedRoles),
      editableRoles: resolveRoleListDefault(defaults.editableRoles, parent.acl.editableRoles),
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

function resolveRoleListDefault(
  value: "inherit-parent",
  parentValue: TreeNodeSnapshot["acl"]["allowedRoles"]
): TreeNodeSnapshot["acl"]["allowedRoles"] {
  return value === "inherit-parent" ? parentValue : parentValue;
}

function resolveAllowedUsersDefault(value: "current-user", user: User): string[] {
  return value === "current-user" ? [user.id] : [user.id];
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
