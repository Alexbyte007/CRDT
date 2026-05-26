import type { NodeAttrs, OperationType, TreeNodeSnapshot, User, UserRole } from "../types";
import { defaultPolicyEngine } from "./default-policy";

export function canViewNode(user: User, node: TreeNodeSnapshot): boolean {
  return defaultPolicyEngine.canViewNode(user, node);
}

export function canEditNode(
  user: User,
  node: TreeNodeSnapshot,
  operationType: OperationType
): boolean {
  return defaultPolicyEngine.canEditNode(user, node, operationType);
}

export function canViewField(user: User, node: TreeNodeSnapshot, fieldName: string): boolean {
  return defaultPolicyEngine.canViewField(user, node, fieldName);
}

export function canEditAttr(user: User, key: keyof NodeAttrs, currentNode: TreeNodeSnapshot): boolean {
  return defaultPolicyEngine.canEditAttr(user, currentNode, key);
}

export function sanitizeAttrsPatch(
  user: User,
  node: TreeNodeSnapshot,
  attrsPatch: Partial<NodeAttrs>
): Partial<NodeAttrs> {
  return defaultPolicyEngine.sanitizeAttrsPatch(user, node, attrsPatch);
}

export function operationAllowedByRole(role: UserRole, operationType: OperationType): boolean {
  if (role === "admin") {
    return true;
  }

  if (role === "manager") {
    return true;
  }

  if (role === "member") {
    return (
      operationType === "addNode" ||
      operationType === "renameNode" ||
      operationType === "updateContent"
    );
  }

  return false;
}
