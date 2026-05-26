# 第三阶段：RBAC + ABAC 访问控制策略与隐私视图生成规则

## 1. 阶段目标

第三阶段的目标是在第二阶段完整 JSON 树数据模型的基础上，设计一套可实现、可测试、可解释的隐私访问控制与视图生成机制。

本项目采用 RBAC + ABAC 混合访问控制策略：

- RBAC（Role-Based Access Control）：基于用户角色判断访问权限。
- ABAC（Attribute-Based Access Control）：基于用户属性和节点属性判断访问权限。

系统不会把完整 Yjs 文档直接同步给普通用户，而是在服务端根据用户身份和权限策略生成用户专属视图。用户只能看到和操作该视图中的节点。用户提交的视图操作需要经过权限校验和逆向映射后，才能写回完整 Yjs 文档。

## 2. 设计目标

访问控制与视图生成机制需要满足以下目标：

1. 不同用户看到不同的 JSON 树视图。
2. 用户视图中不包含无权访问的节点内容。
3. 用户视图中不暴露完整节点的敏感权限元数据。
4. 用户只能执行自己有权限的编辑操作。
5. 视图中的节点保留完整文档中的稳定 `nodeId`，便于逆向映射。
6. 完整文档发生变化后，用户视图可以重新由完整文档投影得到。
7. 权限判断逻辑可测试、可解释，便于写入课程报告。

## 3. 用户模型

系统第一版使用简单用户模型，不接入复杂登录系统。

```ts
export interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "member" | "guest";
  department: string;
  clearanceLevel: number;
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 用户唯一 ID |
| `name` | 用户显示名称 |
| `role` | 用户角色 |
| `department` | 用户所属部门 |
| `clearanceLevel` | 用户密级等级，数字越大权限越高 |

示例用户：

```json
[
  {
    "id": "u-admin",
    "name": "管理员",
    "role": "admin",
    "department": "all",
    "clearanceLevel": 10
  },
  {
    "id": "u-dev-manager",
    "name": "研发经理",
    "role": "manager",
    "department": "dev",
    "clearanceLevel": 3
  },
  {
    "id": "u-dev-member",
    "name": "研发成员",
    "role": "member",
    "department": "dev",
    "clearanceLevel": 1
  },
  {
    "id": "u-guest",
    "name": "访客",
    "role": "guest",
    "department": "external",
    "clearanceLevel": 0
  }
]
```

## 4. 节点权限相关字段

第二阶段已经定义每个节点包含 `attrs` 和 `acl` 两类权限相关字段。

### 4.1 attrs

`attrs` 表示节点业务属性，用于 ABAC 判断。

```ts
export interface NodeAttrs {
  department: string;
  ownerId: string;
  confidentialLevel: number;
  tags?: string[];
  status?: "active" | "archived";
}
```

示例：

```json
{
  "department": "dev",
  "ownerId": "u-dev-manager",
  "confidentialLevel": 2,
  "tags": ["project", "internal"],
  "status": "active"
}
```

### 4.2 acl

`acl` 表示节点级访问控制元数据，用于 RBAC 和显式用户授权。

```ts
export interface NodeAcl {
  visibility: "public" | "department" | "private" | "restricted";
  allowedRoles: string[];
  editableRoles: string[];
  allowedUsers: string[];
  deniedUsers: string[];
}
```

示例：

```json
{
  "visibility": "department",
  "allowedRoles": ["admin", "manager", "member"],
  "editableRoles": ["admin", "manager"],
  "allowedUsers": ["u-dev-manager"],
  "deniedUsers": []
}
```

## 5. 权限判断分层

本项目将权限判断分为三层：

```text
用户是否可见节点
  -> canViewNode(user, node)

用户是否可编辑节点
  -> canEditNode(user, node, operationType)

用户是否可看到字段
  -> canViewField(user, node, fieldName)
```

这样设计的原因是：

- 节点可见不代表所有字段都可见。
- 节点可见不代表可以编辑。
- 不同操作需要不同权限，例如重命名和删除的权限不同。
- 字段级隐藏可以展示“同一个节点下不同用户看到不同内容”的隐私保护效果。

## 6. 节点可见性规则

### 6.1 总体规则

节点是否可见由 RBAC、ABAC 和显式拒绝共同决定。

```text
canViewNode(user, node) =
  user.role == "admin"
  OR
  (
    user.id not in node.acl.deniedUsers
    AND node.attrs.status != "archived"
    AND (
      node.acl.visibility == "public"
      OR user.id in node.acl.allowedUsers
      OR user.role in node.acl.allowedRoles
      OR matchAttributePolicy(user, node)
    )
  )
```

其中 `admin` 是最高权限用户，可以查看完整文档。

### 6.2 visibility 规则

| visibility | 可见规则 |
| --- | --- |
| `public` | 所有用户可见 |
| `department` | 同部门用户、管理员、经理可见 |
| `private` | 节点 owner、显式授权用户、管理员可见 |
| `restricted` | 仅管理员、显式授权用户或满足高密级要求的用户可见 |

具体规则：

```text
public:
  true

department:
  user.department == node.attrs.department
  OR user.role in ["admin", "manager"]

private:
  user.id == node.attrs.ownerId
  OR user.id in node.acl.allowedUsers
  OR user.role == "admin"

restricted:
  user.id in node.acl.allowedUsers
  OR (
    user.role in node.acl.allowedRoles
    AND user.clearanceLevel >= node.attrs.confidentialLevel
  )
```

### 6.3 ABAC 属性规则

ABAC 规则用于根据用户属性和节点属性判断访问权限。

第一版支持以下规则：

```text
部门规则:
  user.department == node.attrs.department

负责人规则:
  user.id == node.attrs.ownerId

密级规则:
  user.clearanceLevel >= node.attrs.confidentialLevel

状态规则:
  node.attrs.status == "active"
```

可以组合为：

```text
matchAttributePolicy(user, node) =
  node.attrs.status == "active"
  AND user.clearanceLevel >= node.attrs.confidentialLevel
  AND (
    user.department == node.attrs.department
    OR user.id == node.attrs.ownerId
  )
```

## 7. 节点编辑权限规则

节点可编辑必须先满足节点可见。

```text
canEditNode(user, node, operationType) =
  canViewNode(user, node)
  AND
  (
    user.role == "admin"
    OR user.role in node.acl.editableRoles
    OR user.id == node.attrs.ownerId
  )
  AND operationAllowedByRole(user.role, operationType)
```

### 7.1 操作类型

第一版支持以下操作类型：

```ts
export type OperationType =
  | "addNode"
  | "deleteNode"
  | "renameNode"
  | "updateContent"
  | "updateAttrs";
```

### 7.2 角色操作矩阵

| 角色 | 添加节点 | 删除节点 | 重命名 | 修改内容 | 修改属性 |
| --- | --- | --- | --- | --- | --- |
| `admin` | 允许 | 允许 | 允许 | 允许 | 允许 |
| `manager` | 允许 | 允许 | 允许 | 允许 | 部分允许 |
| `member` | 允许 | 禁止 | 允许 | 允许 | 禁止 |
| `guest` | 禁止 | 禁止 | 禁止 | 禁止 | 禁止 |

说明：

- `manager` 修改属性时，只允许修改非敏感属性，例如 `status`、`tags`。
- `member` 可以在有编辑权限的节点下添加子节点，但新节点默认继承父节点的部门和较低密级。
- `guest` 只能查看公开视图，不能编辑。

### 7.3 操作级校验

不同操作的校验对象不同：

| 操作 | 校验对象 |
| --- | --- |
| `addNode` | 校验父节点是否可见且可添加子节点 |
| `deleteNode` | 校验目标节点是否可删除 |
| `renameNode` | 校验目标节点是否可重命名 |
| `updateContent` | 校验目标节点是否可编辑内容 |
| `updateAttrs` | 校验目标节点是否可修改属性，同时检查具体字段 |

例如：

```text
addNode:
  canEditNode(user, parentNode, "addNode")

deleteNode:
  canEditNode(user, targetNode, "deleteNode")

updateAttrs:
  canEditNode(user, targetNode, "updateAttrs")
  AND every attrsPatch key is allowed for user.role
```

## 8. 字段级可见性规则

节点可见后，字段仍然可能需要隐藏。

第一版字段级规则如下：

| 字段 | admin | manager | member | guest |
| --- | --- | --- | --- | --- |
| `id` | 可见 | 可见 | 可见 | 可见 |
| `type` | 可见 | 可见 | 可见 | 可见 |
| `title` | 可见 | 可见 | 可见 | 可见 |
| `content` | 可见 | 可见 | 可见 | 仅 public 节点可见 |
| `attrs.department` | 可见 | 可见 | 可见 | 可隐藏 |
| `attrs.ownerId` | 可见 | 可见 | 可隐藏 | 隐藏 |
| `attrs.confidentialLevel` | 可见 | 可见 | 隐藏 | 隐藏 |
| `acl` | 可见 | 隐藏 | 隐藏 | 隐藏 |
| `children` | 可见 | 可见 | 可见 | 可见 |

普通用户视图不直接暴露 `acl`。前端只接收服务端计算后的 `permissions`。

## 9. 用户视图模型

用户视图是完整文档的投影结果，不是 Yjs 完整文档本身。

```ts
export interface UserView {
  userId: string;
  docId: string;
  generatedAt: number;
  roots: ViewNode[];
}

export interface ViewNode {
  id: string;
  parentId: string | null;
  type: string;
  title: string;
  content?: string;
  attrs?: Partial<NodeAttrs>;
  children: ViewNode[];
  permissions: ViewPermissions;
}

export interface ViewPermissions {
  canAddChild: boolean;
  canDelete: boolean;
  canRename: boolean;
  canEditContent: boolean;
  canEditAttrs: boolean;
}
```

视图节点保留 `id`，但只包含该用户可见的字段。

例如，完整节点为：

```json
{
  "id": "node-finance",
  "title": "财务预算",
  "content": "预算 100 万",
  "attrs": {
    "department": "finance",
    "ownerId": "u-finance",
    "confidentialLevel": 3
  },
  "acl": {
    "visibility": "restricted",
    "allowedRoles": ["admin"],
    "editableRoles": ["admin"],
    "allowedUsers": ["u-finance"],
    "deniedUsers": []
  }
}
```

对于无权限用户，该节点不会出现在视图中。对于有部分权限的用户，可能只看到：

```json
{
  "id": "node-finance",
  "parentId": "node-root",
  "type": "doc",
  "title": "财务预算",
  "children": [],
  "permissions": {
    "canAddChild": false,
    "canDelete": false,
    "canRename": false,
    "canEditContent": false,
    "canEditAttrs": false
  }
}
```

## 10. 隐私视图生成算法

### 10.1 正向变换 getView

`getView(fullDoc, user)` 将完整文档投影为用户专属视图。

```text
getView(fullDoc, user):
  roots = []
  for rootId in fullDoc.rootIds:
    viewRoot = projectNode(rootId, user)
    if viewRoot != null:
      roots.append(viewRoot)
  return UserView(user.id, fullDoc.meta.docId, now(), roots)
```

### 10.2 节点投影 projectNode

```text
projectNode(nodeId, user):
  node = fullDoc.nodes[nodeId]

  if node does not exist:
    return null

  if not canViewNode(user, node):
    return null

  viewNode = sanitizeNodeFields(user, node)
  viewNode.permissions = buildViewPermissions(user, node)
  viewNode.children = []

  for childId in node.children:
    childView = projectNode(childId, user)
    if childView != null:
      viewNode.children.append(childView)

  return viewNode
```

该算法遵循“不可见节点及其子树默认隐藏”的策略。

### 10.3 字段清洗 sanitizeNodeFields

```text
sanitizeNodeFields(user, node):
  viewNode.id = node.id
  viewNode.parentId = node.parentId
  viewNode.type = node.type
  viewNode.title = node.title

  if canViewField(user, node, "content"):
    viewNode.content = node.content

  viewNode.attrs = {}

  for each attr in node.attrs:
    if canViewField(user, node, "attrs." + attr):
      viewNode.attrs[attr] = node.attrs[attr]

  return viewNode
```

`acl` 不进入普通用户视图。

### 10.4 视图权限 buildViewPermissions

```text
buildViewPermissions(user, node):
  return {
    canAddChild: canEditNode(user, node, "addNode"),
    canDelete: canEditNode(user, node, "deleteNode"),
    canRename: canEditNode(user, node, "renameNode"),
    canEditContent: canEditNode(user, node, "updateContent"),
    canEditAttrs: canEditNode(user, node, "updateAttrs")
  }
```

前端根据 `permissions` 决定按钮是否可用。即便前端隐藏按钮，服务端仍然必须在提交操作时再次校验。

## 11. 不可见父节点的处理策略

树形数据中可能出现“父节点不可见，但子节点可见”的情况。第一版采用严格子树隐藏策略：

```text
如果父节点不可见，则整个子树都不出现在该用户视图中。
```

理由：

- 实现简单，便于证明。
- 避免通过子节点暴露父节点结构信息。
- 逆向映射更稳定，用户只能在可见路径内编辑。

后续扩展可以支持“子节点提升显示”，即父节点不可见但子节点可见时，将子节点挂载到最近的可见祖先节点下。但这会让路径映射和权限解释变复杂，第一版不采用。

## 12. 视图操作模型

前端不会直接提交完整文档操作，而是提交视图操作。

```ts
export type ViewOperation =
  | ViewAddNodeOperation
  | ViewDeleteNodeOperation
  | ViewRenameNodeOperation
  | ViewUpdateContentOperation
  | ViewUpdateAttrsOperation;

export interface ViewAddNodeOperation {
  type: "addNode";
  parentId: string;
  title: string;
  content?: string;
  index?: number;
}

export interface ViewDeleteNodeOperation {
  type: "deleteNode";
  nodeId: string;
}

export interface ViewRenameNodeOperation {
  type: "renameNode";
  nodeId: string;
  title: string;
}

export interface ViewUpdateContentOperation {
  type: "updateContent";
  nodeId: string;
  content: string;
}

export interface ViewUpdateAttrsOperation {
  type: "updateAttrs";
  nodeId: string;
  attrsPatch: Record<string, unknown>;
}
```

视图操作只包含用户能感知的信息。服务端会根据当前完整文档补全必要字段并生成完整文档操作。

## 13. 视图操作权限校验

所有视图操作必须在服务端重新校验。

```text
validateViewOperation(user, viewOperation, fullDoc):
  targetNode = find operation target in fullDoc

  if targetNode does not exist:
    reject

  if operation is addNode:
    check canEditNode(user, parentNode, "addNode")

  if operation is deleteNode:
    check canEditNode(user, targetNode, "deleteNode")

  if operation is renameNode:
    check canEditNode(user, targetNode, "renameNode")

  if operation is updateContent:
    check canEditNode(user, targetNode, "updateContent")

  if operation is updateAttrs:
    check canEditNode(user, targetNode, "updateAttrs")
    check every attrsPatch field is allowed
```

注意：不能信任前端传来的 `permissions`。前端权限只用于界面展示，真正权限以服务端当前完整文档和策略判断为准。

## 14. 逆向映射规则

视图操作经过校验后，会被转换为完整文档操作。

```text
putOperation(viewOperation, user, fullDoc):
  validateViewOperation(user, viewOperation, fullDoc)

  switch viewOperation.type:
    addNode:
      return buildFullAddNodeOperation(viewOperation, user, fullDoc)
    deleteNode:
      return { type: "deleteNode", nodeId: viewOperation.nodeId }
    renameNode:
      return { type: "renameNode", nodeId: viewOperation.nodeId, title: viewOperation.title }
    updateContent:
      return { type: "updateContent", nodeId: viewOperation.nodeId, content: viewOperation.content }
    updateAttrs:
      return { type: "updateAttrs", nodeId: viewOperation.nodeId, attrsPatch: sanitizeAttrsPatch(...) }
```

### 14.1 添加节点的逆向映射

添加节点时，普通用户不能任意指定敏感属性。服务端需要根据父节点和当前用户补全新节点属性。

```text
buildFullAddNodeOperation(viewOperation, user, fullDoc):
  parent = fullDoc.nodes[viewOperation.parentId]

  newNode.attrs.department = parent.attrs.department
  newNode.attrs.ownerId = user.id
  newNode.attrs.confidentialLevel = min(user.clearanceLevel, parent.attrs.confidentialLevel)
  newNode.attrs.status = "active"

  newNode.acl.visibility = parent.acl.visibility
  newNode.acl.allowedRoles = deriveAllowedRoles(user, parent)
  newNode.acl.editableRoles = deriveEditableRoles(user, parent)
  newNode.acl.allowedUsers = [user.id]
  newNode.acl.deniedUsers = []

  return addNode operation
```

这样可以防止普通用户创建超出自己权限范围的新节点。

### 14.2 修改属性的逆向映射

属性修改需要过滤敏感字段。

```text
sanitizeAttrsPatch(user, attrsPatch):
  result = {}
  for each key in attrsPatch:
    if canEditAttr(user, key):
      result[key] = attrsPatch[key]
  return result
```

第一版属性编辑规则：

| 字段 | admin | manager | member | guest |
| --- | --- | --- | --- | --- |
| `department` | 可改 | 禁止 | 禁止 | 禁止 |
| `ownerId` | 可改 | 禁止 | 禁止 | 禁止 |
| `confidentialLevel` | 可改 | 可降低不可升高 | 禁止 | 禁止 |
| `tags` | 可改 | 可改 | 可改 | 禁止 |
| `status` | 可改 | 可改 | 禁止 | 禁止 |

## 15. 隐私视图变换性质

本项目不实现完整通用 BX 语言，但实现一个面向 JSON 树的轻量级双向视图变换机制。

可以用以下两个函数描述：

```text
get: FullDoc × User -> UserView
put: FullDoc × User × ViewOperation -> FullDocOperation
```

需要满足的性质：

### 15.1 视图安全性

```text
对于任意用户 u 和完整文档 s，
get(s, u) 中不包含 u 无权访问的节点和字段。
```

### 15.2 写回安全性

```text
对于任意用户 u、完整文档 s 和视图操作 op，
put(s, u, op) 只有在权限校验通过时才产生完整文档操作。
```

### 15.3 身份保持性

```text
视图节点保留完整文档节点 ID。
因此视图操作可以根据 nodeId 映射回完整文档节点。
```

### 15.4 最终投影一致性

```text
如果完整文档经 Yjs 合并后达到状态 s_final，
则用户最终看到的视图为 get(s_final, u)。
```

也就是说，最终一致性由 Yjs 在完整文档层保证，隐私视图层通过重新投影保证不同用户视图与完整文档状态一致。

## 16. 示例场景

完整文档：

```text
项目空间 public
  ├── 公开说明 public
  ├── 研发计划 department=dev, level=1
  │   └── 模块 A 设计 department=dev, level=2
  ├── 财务预算 department=finance, level=3, restricted
  └── 管理员备忘录 private, owner=u-admin
```

### 16.1 管理员视图

管理员可看到：

```text
项目空间
  ├── 公开说明
  ├── 研发计划
  │   └── 模块 A 设计
  ├── 财务预算
  └── 管理员备忘录
```

### 16.2 研发经理视图

研发经理可看到：

```text
项目空间
  ├── 公开说明
  └── 研发计划
      └── 模块 A 设计
```

### 16.3 研发成员视图

研发成员可看到：

```text
项目空间
  ├── 公开说明
  └── 研发计划
```

如果研发成员密级不足，则看不到 `模块 A 设计`。

### 16.4 访客视图

访客可看到：

```text
项目空间
  └── 公开说明
```

访客没有编辑权限。

## 17. 测试设计建议

第三阶段对应的测试应覆盖以下内容：

1. `admin` 可以查看完整文档。
2. `guest` 只能查看 `public` 节点。
3. 同部门 `member` 可以查看低密级部门节点。
4. 密级不足的用户看不到高密级节点。
5. `deniedUsers` 优先级高于普通授权。
6. 普通用户视图中不包含 `acl`。
7. 用户不能通过伪造视图操作修改不可见节点。
8. 用户不能修改自己无权修改的属性。
9. 添加节点时，服务端自动补全安全的 `attrs` 和 `acl`。
10. 完整文档更新后，用户视图由 `getView` 重新投影得到。

## 18. 后续实现建议

第三阶段完成后，代码实现可以按以下顺序进行：

1. 定义 `User`、`NodeAttrs`、`NodeAcl`、`ViewNode`、`UserView` 类型。
2. 实现 `canViewNode(user, node)`。
3. 实现 `canEditNode(user, node, operationType)`。
4. 实现 `canViewField(user, node, fieldName)`。
5. 实现 `getView(fullDoc, user)`。
6. 实现 `validateViewOperation(user, op, fullDoc)`。
7. 实现 `putOperation(viewOperation, user, fullDoc)`。
8. 编写访问控制和视图生成单元测试。

## 19. 第三阶段结论

第三阶段确定了本项目的隐私访问控制方案：

> 系统采用 RBAC + ABAC 混合访问控制策略。RBAC 根据用户角色控制基础操作能力，ABAC 根据用户属性和节点属性控制节点可见性。完整 Yjs 文档只保存在服务端，普通用户通过 `getView(fullDoc, user)` 获得专属隐私视图。用户提交的视图操作经过 `validateViewOperation` 权限校验，再通过 `putOperation` 逆向映射为完整文档操作，最终写入 Yjs 完整数据层。

该设计使系统能够在复用 Yjs 最终一致性能力的同时，避免传统 CRDT 协同编辑中所有用户默认共享完整视图的问题。
