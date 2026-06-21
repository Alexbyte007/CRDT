import { getNodeSnapshot } from "../crdt/snapshot";
import { AccessControlError, type NodeId, type TreeNodeSnapshot, type User } from "../types";
import type { CollaborationContext } from "./types";

export interface DeleteImpactVisibleNode {
  id: NodeId;
  title: string;
  visibleTo: string[];
  reason: "not-deletable";
}

export interface DeleteImpactUser {
  id: string;
  name: string;
  role: User["role"];
  department: string;
}

export interface DeleteImpactResult {
  nodeId: NodeId;
  deleteCount: number;
  deletedRootVisibleTo: string[];
  visibleNodes: DeleteImpactVisibleNode[];
  affectedUsers: DeleteImpactUser[];
  blocksSilentDelete: boolean;
  canResolveConflict: boolean;
}

export function analyzeDeleteImpact(
  context: CollaborationContext,
  actor: User,
  nodeId: NodeId
): DeleteImpactResult {
  const root = getNodeSnapshot(context.crdt, nodeId);
  if (!root) {
    throw new Error(`Node does not exist: ${nodeId}`);
  }

  if (!context.policyEngine.canViewNode(actor, root)) {
    throw new AccessControlError(`User ${actor.id} cannot view node ${nodeId}.`);
  }

  if (!context.policyEngine.canEditNode(actor, root, "deleteNode")) {
    throw new AccessControlError(`User ${actor.id} is not allowed to delete node ${nodeId}.`);
  }

  const subtree = collectSubtree(context, root);
  const affectedUsersById = new Map<string, DeleteImpactUser>();
  const visibleNodes: DeleteImpactVisibleNode[] = [];

  const deletedRootVisibleTo = usersWhoCanView(context, actor, root).map((user) => user.id);

  for (const node of subtree.slice(1)) {
    if (context.policyEngine.canEditNode(actor, node, "deleteNode")) {
      continue;
    }

    const visibleTo = usersWhoCanView(context, actor, node);

    visibleNodes.push({
      id: node.id,
      title: node.title,
      visibleTo: visibleTo.map((user) => user.id),
      reason: "not-deletable"
    });

    for (const user of visibleTo) {
      affectedUsersById.set(user.id, {
        id: user.id,
        name: user.name,
        role: user.role,
        department: user.department
      });
    }
  }

  return {
    nodeId,
    deleteCount: subtree.length,
    deletedRootVisibleTo,
    visibleNodes,
    affectedUsers: Array.from(affectedUsersById.values()),
    blocksSilentDelete: visibleNodes.length > 0,
    canResolveConflict: canResolveDeleteConflict(actor, root)
  };
}

export function canResolveDeleteConflict(actor: User, node: TreeNodeSnapshot): boolean {
  if (actor.role === "admin") {
    return true;
  }

  return (
    node.acl.advancedPermissions?.deleteConflictResolverUserIds?.includes(actor.id) ?? false
  );
}

function usersWhoCanView(context: CollaborationContext, actor: User, node: TreeNodeSnapshot): User[] {
  return Array.from(context.users.values()).filter(
    (user) => user.id !== actor.id && context.policyEngine.canViewNode(user, node)
  );
}

function collectSubtree(context: CollaborationContext, root: TreeNodeSnapshot): TreeNodeSnapshot[] {
  const nodes = [root];
  for (const childId of root.children) {
    const child = getNodeSnapshot(context.crdt, childId);
    if (child) {
      nodes.push(...collectSubtree(context, child));
    }
  }
  return nodes;
}
