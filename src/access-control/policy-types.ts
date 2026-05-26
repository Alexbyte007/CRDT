import type { NodeAttrs, OperationType } from "../types";

export interface PrivacyPolicyConfig {
  name: string;
  source: "JSONTree";
  description?: string;
  view: {
    defaultVisible: boolean;
    nodeRules: NodeVisibilityRule[];
    fieldRules: FieldVisibilityRule[];
  };
  put: {
    operationRules: OperationRule[];
    attrRules: AttrRule[];
  };
  putDefaults: {
    addNode: AddNodeDefaults;
  };
}

export interface NodeVisibilityRule {
  name: string;
  match: string;
  visible: boolean;
}

export interface FieldVisibilityRule {
  name: string;
  match: string;
  visible: boolean;
}

export interface OperationRule {
  name: string;
  match: string;
  operations: OperationType[];
}

export interface AttrRule {
  name: string;
  match: string;
  attrs: Array<keyof NodeAttrs>;
  constraints?: AttrConstraint[];
}

export interface AttrConstraint {
  attr: keyof NodeAttrs;
  match: string;
}

export interface AddNodeDefaults {
  type: "doc";
  department: "inherit-parent";
  visibility: "inherit-parent";
  allowedRoles: "inherit-parent";
  editableRoles: "inherit-parent";
  ownerId: "current-user";
  allowedUsers: "current-user";
  status: "active";
}
