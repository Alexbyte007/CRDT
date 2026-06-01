export type NodeId = string;
export type UserId = string;

export type NodeType = "folder" | "doc" | "task";
export type UserRole = "admin" | "manager" | "member" | "guest";
export type NodeVisibility = "public" | "department" | "private" | "restricted";
export type OperationType =
  | "addNode"
  | "deleteNode"
  | "deleteNodeKeepChildren"
  | "renameNode"
  | "updateContent"
  | "updateAttrs"
  | "updateAcl";

export interface User {
  id: UserId;
  name: string;
  role: UserRole;
  department: string;
}

export interface DocumentMeta {
  docId: string;
  title: string;
  schemaVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface NodeAttrs {
  department: string;
  ownerId: UserId;
  tags?: string[];
  status?: "active" | "archived";
}

export interface NodeAcl {
  visibility: NodeVisibility;
  allowedRoles: UserRole[];
  editableRoles: UserRole[];
  contentEditableRoles?: UserRole[];
  childAddableRoles?: UserRole[];
  deletableRoles?: UserRole[];
  allowedUsers: UserId[];
  deniedUsers: UserId[];
}

export interface TreeNodeSnapshot {
  id: NodeId;
  parentId: NodeId | null;
  type: NodeType;
  title: string;
  content: string;
  attrs: NodeAttrs;
  acl: NodeAcl;
  children: NodeId[];
  createdBy: UserId;
  createdAt: number;
  updatedBy: UserId;
  updatedAt: number;
}

export interface DocumentSnapshot {
  meta: DocumentMeta;
  rootIds: NodeId[];
  nodes: Record<NodeId, TreeNodeSnapshot>;
  tombstones: Record<NodeId, TreeNodeSnapshot>;
}

export type FullDocOperation =
  | AddNodeOperation
  | DeleteNodeOperation
  | DeleteNodeKeepChildrenOperation
  | RenameNodeOperation
  | UpdateContentOperation
  | UpdateAttrsOperation
  | UpdateAclOperation;

export interface AddNodeOperation {
  type: "addNode";
  parentId: NodeId | null;
  node: NewTreeNode;
  index?: number;
  actorId: UserId;
  timestamp?: number;
}

export interface DeleteNodeOperation {
  type: "deleteNode";
  nodeId: NodeId;
  actorId: UserId;
  timestamp?: number;
}

export interface DeleteNodeKeepChildrenOperation {
  type: "deleteNodeKeepChildren";
  nodeId: NodeId;
  actorId: UserId;
  timestamp?: number;
}

export interface RenameNodeOperation {
  type: "renameNode";
  nodeId: NodeId;
  title: string;
  actorId: UserId;
  timestamp?: number;
}

export interface UpdateContentOperation {
  type: "updateContent";
  nodeId: NodeId;
  content: string;
  actorId: UserId;
  timestamp?: number;
}

export interface UpdateAttrsOperation {
  type: "updateAttrs";
  nodeId: NodeId;
  attrsPatch: Partial<NodeAttrs>;
  actorId: UserId;
  timestamp?: number;
}

export interface UpdateAclOperation {
  type: "updateAcl";
  nodeId: NodeId;
  aclPatch: Partial<NodeAcl>;
  actorId: UserId;
  timestamp?: number;
}

export interface UserView {
  userId: UserId;
  docId: string;
  generatedAt: number;
  roots: ViewNode[];
}

export interface ViewNode {
  id: NodeId;
  parentId: NodeId | null;
  type: NodeType;
  title: string;
  content?: string;
  attrs?: Partial<NodeAttrs>;
  acl?: Pick<
    NodeAcl,
    "visibility" | "allowedRoles" | "contentEditableRoles" | "childAddableRoles" | "deletableRoles"
  >;
  children: ViewNode[];
  permissions: ViewPermissions;
  virtual?: boolean;
  virtualReason?: "restrictedPath";
}

export interface ViewPermissions {
  canAddChild: boolean;
  canDelete: boolean;
  canRename: boolean;
  canEditContent: boolean;
  canEditAttrs: boolean;
  canEditAcl: boolean;
}

export type ViewOperation =
  | ViewAddNodeOperation
  | ViewDeleteNodeOperation
  | ViewDeleteNodeKeepChildrenOperation
  | ViewRenameNodeOperation
  | ViewUpdateContentOperation
  | ViewUpdateAttrsOperation
  | ViewUpdateAclOperation;

export interface ViewAddNodeOperation {
  type: "addNode";
  parentId: NodeId;
  nodeId?: NodeId;
  title: string;
  content?: string;
  index?: number;
}

export interface ViewDeleteNodeOperation {
  type: "deleteNode";
  nodeId: NodeId;
}

export interface ViewDeleteNodeKeepChildrenOperation {
  type: "deleteNodeKeepChildren";
  nodeId: NodeId;
}

export interface ViewRenameNodeOperation {
  type: "renameNode";
  nodeId: NodeId;
  title: string;
}

export interface ViewUpdateContentOperation {
  type: "updateContent";
  nodeId: NodeId;
  content: string;
}

export interface ViewUpdateAttrsOperation {
  type: "updateAttrs";
  nodeId: NodeId;
  attrsPatch: Partial<NodeAttrs>;
}

export interface ViewUpdateAclOperation {
  type: "updateAcl";
  nodeId: NodeId;
  aclPatch: Pick<
    Partial<NodeAcl>,
    "visibility" | "allowedRoles" | "contentEditableRoles" | "childAddableRoles" | "deletableRoles"
  >;
}

export interface ViewOperationEnvelope {
  id: string;
  userId: UserId;
  baseStateVector: string;
  createdAt: number;
  operation: ViewOperation;
}

export type NewTreeNode = Omit<
  TreeNodeSnapshot,
  "parentId" | "children" | "createdAt" | "updatedAt" | "updatedBy"
> &
  Partial<Pick<TreeNodeSnapshot, "children" | "createdAt" | "updatedAt" | "updatedBy">>;

export class CrdtDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CrdtDocumentError";
  }
}

export class AccessControlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccessControlError";
  }
}
