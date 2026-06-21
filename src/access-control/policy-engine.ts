import type { NodeAcl, NodeAttrs, OperationType, TreeNodeSnapshot, User, UserRole } from "../types";
import type { AttrRule, PrivacyPolicyConfig } from "./policy-types";
import { evaluateExpression } from "./expression";

export class PolicyEngine {
  constructor(private readonly config: PrivacyPolicyConfig) {}

  getConfig(): PrivacyPolicyConfig {
    return this.config;
  }

  get name(): string {
    return this.config.name;
  }

  canViewNode(user: User, node: TreeNodeSnapshot): boolean {
    let visible = this.config.view.defaultVisible;

    for (const rule of this.config.view.nodeRules) {
      if (evaluateExpression(rule.match, { user, node })) {
        visible = rule.visible;
      }
    }

    return visible;
  }

  canViewField(user: User, node: TreeNodeSnapshot, field: string): boolean {
    let visible = false;

    for (const rule of this.config.view.fieldRules) {
      if (evaluateExpression(rule.match, { user, node, field })) {
        visible = rule.visible;
      }
    }

    return visible;
  }

  canEditNode(user: User, node: TreeNodeSnapshot, operationType: OperationType): boolean {
    if (!this.canViewNode(user, node)) {
      return false;
    }

    if (operationType === "updateAcl") {
      return user.role === "admin";
    }

    if (user.role === "admin") {
      return true;
    }

    const roles = this.rolesForOperation(node.acl, operationType);
    if (roles) {
      return roles.includes(user.role);
    }

    return this.config.put.operationRules.some(
      (rule) =>
        rule.operations.includes(operationType) && evaluateExpression(rule.match, { user, node })
    );
  }

  private rolesForOperation(acl: NodeAcl, operationType: OperationType): UserRole[] | undefined {
    switch (operationType) {
      case "renameNode":
      case "updateContent":
        return acl.contentEditableRoles ?? acl.editableRoles;
      case "addNode":
        return acl.childAddableRoles ?? acl.editableRoles;
      case "deleteNode":
      case "deleteNodeKeepChildren":
        return acl.deletableRoles ?? acl.editableRoles;
      case "updateAttrs":
        return acl.contentEditableRoles ?? acl.editableRoles;
      case "updateAcl":
        return ["admin"];
      default:
        return undefined;
    }
  }

  canEditAttr(user: User, node: TreeNodeSnapshot, attr: keyof NodeAttrs, value?: unknown): boolean {
    if (attr === "priority" || attr === "budget" || attr === "taskStatus") {
      return this.canEditNode(user, node, "updateContent");
    }

    if (!this.canEditNode(user, node, "updateAttrs")) {
      return false;
    }

    return this.config.put.attrRules.some((rule) =>
      this.matchesAttrRule(rule, user, node, attr, value)
    );
  }

  sanitizeAttrsPatch(
    user: User,
    node: TreeNodeSnapshot,
    attrsPatch: Partial<NodeAttrs>
  ): Partial<NodeAttrs> {
    const result: Partial<NodeAttrs> = {};

    for (const [key, value] of Object.entries(attrsPatch) as Array<
      [keyof NodeAttrs, NodeAttrs[keyof NodeAttrs]]
    >) {
      if (this.canEditAttr(user, node, key, value)) {
        Object.assign(result, { [key]: value });
      }
    }

    return result;
  }

  getAddNodeDefaults() {
    return this.config.putDefaults.addNode;
  }

  private matchesAttrRule(
    rule: AttrRule,
    user: User,
    node: TreeNodeSnapshot,
    attr: keyof NodeAttrs,
    value: unknown
  ): boolean {
    if (!rule.attrs.includes(attr)) {
      return false;
    }

    if (!evaluateExpression(rule.match, { user, node, value })) {
      return false;
    }

    for (const constraint of rule.constraints ?? []) {
      if (constraint.attr === attr && !evaluateExpression(constraint.match, { user, node, value })) {
        return false;
      }
    }

    return true;
  }
}
