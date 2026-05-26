# 第二阶段：Yjs 完整 JSON 树数据模型设计

## 1. 阶段目标

第二阶段的目标是确定完整文档在 Yjs 中的存储结构，为后续隐私视图生成、权限校验、逆向操作映射和并发合并提供稳定的数据基础。

本项目选择使用 Yjs 作为底层 CRDT 一致性引擎。Yjs 负责处理并发更新、操作合并和最终一致性；项目自身负责在 Yjs 文档之上定义结构化 JSON 树模型、访问控制元数据和编辑操作语义。

本阶段需要明确以下问题：

1. 完整 JSON 树在 `Y.Doc` 中如何表示。
2. 每个节点包含哪些字段。
3. 节点之间的父子关系和顺序如何保存。
4. 权限相关属性如何嵌入数据模型。
5. 基本编辑操作如何映射到 Yjs 数据结构。
6. 该模型如何支持后续隐私视图变换。

## 2. 设计原则

完整数据模型遵循以下原则：

1. **节点稳定标识**：每个节点必须有全局唯一且稳定的 `id`，用户视图中的节点也保留该 `id`，便于逆向映射。
2. **内容与权限分离**：节点正文内容、业务属性和访问控制元数据分开存储，方便权限策略判断。
3. **树关系显式化**：每个节点保存 `parentId` 和 `children`，既方便向上校验路径权限，也方便向下生成子树视图。
4. **适配 Yjs 并发模型**：节点字段使用 `Y.Map`，子节点顺序使用 `Y.Array`，让 Yjs 处理并发字段修改和并发插入。
5. **服务端持有完整文档**：完整 Yjs 文档只存在于服务端可信环境，普通用户客户端只接收投影后的视图数据。
6. **支持权限投影**：节点属性中必须包含足够的信息，使 RBAC + ABAC 策略能够判断节点可见性和可编辑性。

## 3. Yjs 顶层结构

完整文档使用一个 `Y.Doc` 表示。文档中包含以下顶层共享类型：

```text
Y.Doc
  ├── meta: Y.Map
  ├── nodes: Y.Map<nodeId, Y.Map>
  ├── rootIds: Y.Array<nodeId>
  └── tombstones: Y.Map<nodeId, Y.Map>
```

各部分含义如下：

| 字段 | Yjs 类型 | 说明 |
| --- | --- | --- |
| `meta` | `Y.Map` | 文档元信息，如文档 ID、标题、版本、创建时间 |
| `nodes` | `Y.Map` | 活跃节点注册表，通过节点 ID 查找节点 |
| `rootIds` | `Y.Array` | 根节点 ID 列表，用于支持一个文档包含多个根节点 |
| `tombstones` | `Y.Map` | 已删除节点记录，用于审计、测试和处理删除后的操作校验 |

采用节点注册表而不是纯递归嵌套结构的原因是：

- 权限校验时可以通过 `nodeId` 直接找到完整节点。
- 用户视图中的操作可以根据 `nodeId` 逆向映射到完整文档。
- 删除、移动、并发修改时不需要在深层树结构中查找对象。
- 后续实现视图增量更新时更容易定位变化节点。

## 4. 节点数据结构

每个节点使用一个 `Y.Map` 表示，结构如下：

```text
node: Y.Map
  ├── id: string
  ├── parentId: string | null
  ├── type: string
  ├── title: string
  ├── content: string
  ├── attrs: Y.Map
  ├── acl: Y.Map
  ├── children: Y.Array<string>
  ├── createdBy: string
  ├── createdAt: number
  ├── updatedBy: string
  └── updatedAt: number
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 节点唯一 ID，创建后不变 |
| `parentId` | `string \| null` | 父节点 ID，根节点为 `null` |
| `type` | `string` | 节点类型，例如 `folder`、`doc`、`task` |
| `title` | `string` | 节点标题，用于树上显示 |
| `content` | `string` | 节点正文内容，第一版使用普通字符串 |
| `attrs` | `Y.Map` | 业务属性，用于 ABAC 判断 |
| `acl` | `Y.Map` | 节点级权限元数据 |
| `children` | `Y.Array<string>` | 子节点 ID 列表，保存子节点顺序 |
| `createdBy` | `string` | 创建者用户 ID |
| `createdAt` | `number` | 创建时间戳 |
| `updatedBy` | `string` | 最后修改者用户 ID |
| `updatedAt` | `number` | 最后修改时间戳 |

## 5. 业务属性 attrs

`attrs` 用于描述节点业务属性，主要服务于 ABAC 策略。

建议第一版支持以下属性：

```json
{
  "department": "dev",
  "ownerId": "u1",
  "confidentialLevel": 1,
  "tags": ["project", "internal"],
  "status": "active"
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `department` | `string` | 节点所属部门 |
| `ownerId` | `string` | 节点负责人 |
| `confidentialLevel` | `number` | 节点密级，数字越大权限要求越高 |
| `tags` | `string[]` | 标签，可用于扩展筛选 |
| `status` | `string` | 节点状态，例如 `active`、`archived` |

ABAC 策略可以基于这些属性进行判断。例如：

```text
user.department == node.attrs.department
user.clearanceLevel >= node.attrs.confidentialLevel
user.id == node.attrs.ownerId
```

## 6. 权限元数据 acl

`acl` 用于描述节点级访问控制信息，主要服务于 RBAC 和局部授权。

建议第一版支持以下结构：

```json
{
  "visibility": "restricted",
  "allowedRoles": ["admin", "manager"],
  "editableRoles": ["admin"],
  "allowedUsers": ["u1", "u2"],
  "deniedUsers": []
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `visibility` | `string` | 可见性，可取 `public`、`department`、`private`、`restricted` |
| `allowedRoles` | `string[]` | 允许查看的角色 |
| `editableRoles` | `string[]` | 允许编辑的角色 |
| `allowedUsers` | `string[]` | 显式允许访问的用户 |
| `deniedUsers` | `string[]` | 显式拒绝访问的用户 |

RBAC 和 ABAC 的组合方式如下：

```text
节点是否可见 =
  用户未被 deniedUsers 拒绝
  并且
  (
    用户角色属于 allowedRoles
    或用户 ID 属于 allowedUsers
    或用户属性满足 attrs 中的 ABAC 条件
  )
```

具体判断逻辑将在第三阶段访问控制策略设计中进一步展开。

## 7. 完整文档示例

完整 JSON 树在逻辑上可以表示为：

```json
{
  "meta": {
    "docId": "doc-001",
    "title": "项目协同文档",
    "schemaVersion": 1
  },
  "rootIds": ["node-root"],
  "nodes": {
    "node-root": {
      "id": "node-root",
      "parentId": null,
      "type": "folder",
      "title": "项目空间",
      "content": "",
      "attrs": {
        "department": "all",
        "ownerId": "admin",
        "confidentialLevel": 0,
        "status": "active"
      },
      "acl": {
        "visibility": "public",
        "allowedRoles": ["admin", "manager", "member", "guest"],
        "editableRoles": ["admin"],
        "allowedUsers": [],
        "deniedUsers": []
      },
      "children": ["node-dev", "node-finance"]
    },
    "node-dev": {
      "id": "node-dev",
      "parentId": "node-root",
      "type": "doc",
      "title": "研发计划",
      "content": "研发部门可见内容",
      "attrs": {
        "department": "dev",
        "ownerId": "u1",
        "confidentialLevel": 1,
        "status": "active"
      },
      "acl": {
        "visibility": "department",
        "allowedRoles": ["admin", "manager", "member"],
        "editableRoles": ["admin", "manager"],
        "allowedUsers": ["u1"],
        "deniedUsers": []
      },
      "children": []
    },
    "node-finance": {
      "id": "node-finance",
      "parentId": "node-root",
      "type": "doc",
      "title": "财务预算",
      "content": "财务敏感内容",
      "attrs": {
        "department": "finance",
        "ownerId": "u2",
        "confidentialLevel": 3,
        "status": "active"
      },
      "acl": {
        "visibility": "restricted",
        "allowedRoles": ["admin"],
        "editableRoles": ["admin"],
        "allowedUsers": ["u2"],
        "deniedUsers": []
      },
      "children": []
    }
  }
}
```

在真实实现中，上述结构不会作为普通 JSON 直接保存，而是映射到 `Y.Doc`、`Y.Map` 和 `Y.Array`。

## 8. TypeScript 类型定义

项目代码中建议使用以下类型描述逻辑数据：

```ts
export type NodeId = string;
export type UserId = string;

export type NodeVisibility = "public" | "department" | "private" | "restricted";

export interface NodeAttrs {
  department: string;
  ownerId: UserId;
  confidentialLevel: number;
  tags?: string[];
  status?: "active" | "archived";
}

export interface NodeAcl {
  visibility: NodeVisibility;
  allowedRoles: string[];
  editableRoles: string[];
  allowedUsers: UserId[];
  deniedUsers: UserId[];
}

export interface TreeNodeSnapshot {
  id: NodeId;
  parentId: NodeId | null;
  type: "folder" | "doc" | "task";
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
```

这里的 `TreeNodeSnapshot` 是从 Yjs 结构转换出来的普通对象，主要用于权限判断、视图投影、测试断言和前端展示。

## 9. Yjs 映射方式

Yjs 中的创建方式可以按以下逻辑实现：

```ts
const doc = new Y.Doc();

const meta = doc.getMap("meta");
const nodes = doc.getMap("nodes");
const rootIds = doc.getArray("rootIds");
const tombstones = doc.getMap("tombstones");
```

创建节点时：

```ts
const node = new Y.Map();
node.set("id", nodeId);
node.set("parentId", parentId);
node.set("type", "doc");
node.set("title", "新节点");
node.set("content", "");

const attrs = new Y.Map();
attrs.set("department", "dev");
attrs.set("ownerId", "u1");
attrs.set("confidentialLevel", 1);
attrs.set("status", "active");
node.set("attrs", attrs);

const acl = new Y.Map();
acl.set("visibility", "department");
acl.set("allowedRoles", ["admin", "manager", "member"]);
acl.set("editableRoles", ["admin", "manager"]);
acl.set("allowedUsers", ["u1"]);
acl.set("deniedUsers", []);
node.set("acl", acl);

const children = new Y.Array();
node.set("children", children);

nodes.set(nodeId, node);
```

说明：

- 第一版中 `allowedRoles`、`editableRoles` 等数组可以先作为普通数组存入 `Y.Map`。
- 如果后续需要多人同时编辑权限数组，可以进一步改为 `Y.Array`。
- `content` 第一版使用字符串；如果后续要支持富文本，可以替换为 `Y.Text`。

## 10. 基本操作模型

所有前端编辑都先转换为操作对象，再由服务端映射到 Yjs 更新。

第一版定义以下完整文档操作：

```ts
export type FullDocOperation =
  | AddNodeOperation
  | DeleteNodeOperation
  | RenameNodeOperation
  | UpdateContentOperation
  | UpdateAttrsOperation;

export interface AddNodeOperation {
  type: "addNode";
  parentId: NodeId | null;
  node: Omit<TreeNodeSnapshot, "createdAt" | "updatedAt">;
  index?: number;
}

export interface DeleteNodeOperation {
  type: "deleteNode";
  nodeId: NodeId;
}

export interface RenameNodeOperation {
  type: "renameNode";
  nodeId: NodeId;
  title: string;
}

export interface UpdateContentOperation {
  type: "updateContent";
  nodeId: NodeId;
  content: string;
}

export interface UpdateAttrsOperation {
  type: "updateAttrs";
  nodeId: NodeId;
  attrsPatch: Partial<NodeAttrs>;
}
```

这些操作是完整文档层的标准操作。用户在视图中产生的 `ViewOperation` 后续会被隐私视图变换层转换为这些 `FullDocOperation`。

## 11. 操作到 Yjs 的映射

### 11.1 添加节点

添加节点时需要同时完成两件事：

1. 将新节点写入 `nodes` 注册表。
2. 将新节点 ID 插入父节点的 `children` 或顶层 `rootIds`。

```text
addNode(parentId, node, index)
  -> nodes.set(node.id, nodeMap)
  -> if parentId == null:
       rootIds.insert(index, [node.id])
     else:
       parent.children.insert(index, [node.id])
```

并发语义：

- 多个用户同时向同一父节点插入子节点时，Yjs 的 `Y.Array` 会保留所有插入，不丢失节点。
- 并发插入的相对顺序由 Yjs 内部 CRDT 规则确定，系统不依赖全局顺序。

### 11.2 删除节点

删除节点采用子树删除策略。

```text
deleteNode(nodeId)
  -> 从父节点 children 或 rootIds 中移除 nodeId
  -> 递归找到所有后代节点
  -> 将被删除节点从 nodes 移动到 tombstones
```

第一版中，删除节点表示用户不再能在完整文档中访问该节点。为了测试和审计，可以将删除前的快照保存到 `tombstones`。

并发语义：

- 如果一个用户删除节点，另一个用户同时修改该节点，最终完整文档可能出现“删除获胜”或“字段更新仍保留在 tombstone 中”的情况。
- 第一版采用删除获胜策略：只要节点已从活跃树移除，后续对该节点的视图操作都应被拒绝或忽略。

### 11.3 重命名节点

```text
renameNode(nodeId, title)
  -> nodes.get(nodeId).set("title", title)
  -> 更新 updatedBy 和 updatedAt
```

并发语义：

- 多个用户同时修改 `title` 时，Yjs 对同一 Map 键采用最后写入语义。
- 课程项目中可以接受该行为，并在报告中说明字段级并发修改采用 Yjs 默认冲突解决策略。

### 11.4 修改内容

```text
updateContent(nodeId, content)
  -> nodes.get(nodeId).set("content", content)
  -> 更新 updatedBy 和 updatedAt
```

第一版中，节点正文作为整体字符串更新。这样实现简单，适合结构化树编辑器原型。

如果希望增强并发文本编辑能力，可以在扩展版本中将 `content` 替换为 `Y.Text`。

### 11.5 修改属性

```text
updateAttrs(nodeId, attrsPatch)
  -> 对 attrsPatch 中每个字段执行 node.attrs.set(key, value)
  -> 更新 updatedBy 和 updatedAt
```

修改属性会影响后续视图投影。例如，节点的 `department` 或 `confidentialLevel` 被修改后，部分用户可能失去或获得该节点的可见权限。

因此，每次属性更新后，服务端需要重新计算受影响用户的视图。

## 12. 与隐私视图层的关系

该数据模型为隐私视图层提供以下支持：

1. 用户视图中的每个可见节点保留完整文档中的 `nodeId`。
2. 服务端可以通过 `nodes.get(nodeId)` 快速定位真实节点。
3. `attrs` 和 `acl` 为 RBAC + ABAC 判断提供输入。
4. `children` 提供稳定的树结构顺序，便于生成用户视图树。
5. `parentId` 支持路径权限校验，例如父节点不可见时子节点是否允许提升显示。
6. `tombstones` 支持删除冲突和非法操作检测。

用户视图中的节点并不一定包含完整节点字段。对于普通用户，视图节点可以只包含：

```ts
export interface ViewNode {
  id: NodeId;
  parentId: NodeId | null;
  type: string;
  title: string;
  content?: string;
  children: ViewNode[];
  permissions: {
    canAddChild: boolean;
    canDelete: boolean;
    canRename: boolean;
    canEditContent: boolean;
    canEditAttrs: boolean;
  };
}
```

注意：普通用户视图中不应该直接暴露完整 `acl`，也不应该暴露无关的敏感 `attrs`。

## 13. 初始化示例数据

项目第一版建议内置三类用户和一份示例文档。

用户示例：

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

文档示例：

```text
项目空间
  ├── 公开说明
  ├── 研发计划
  │   └── 模块 A 设计
  ├── 财务预算
  └── 管理员备忘录
```

不同用户登录后应看到不同视图：

| 用户 | 可见内容示例 |
| --- | --- |
| 管理员 | 全部节点 |
| 研发经理 | 公开说明、研发计划、模块 A 设计 |
| 研发成员 | 公开说明、研发计划中低密级内容 |
| 访客 | 公开说明 |

## 14. 后续实现建议

第二阶段完成后，代码实现可以按以下顺序展开：

1. 创建项目目录和 TypeScript 工程。
2. 安装 `yjs`、`typescript`、`vitest`。
3. 实现 `createDocument()`，初始化 `Y.Doc` 顶层结构。
4. 实现节点序列化和反序列化工具。
5. 实现 `addNode`、`deleteNode`、`renameNode`、`updateContent`、`updateAttrs`。
6. 编写单元测试验证节点操作和 Yjs 合并行为。

## 15. 第二阶段结论

完整 JSON 树采用“节点注册表 + 显式父子关系”的方式存储在 Yjs 中：

```text
Y.Doc
  ├── meta
  ├── nodes
  ├── rootIds
  └── tombstones
```

每个节点通过稳定 `id` 标识，使用 `Y.Map` 保存字段，使用 `Y.Array` 保存子节点顺序。节点中的 `attrs` 和 `acl` 为后续 RBAC + ABAC 访问控制提供数据基础。用户视图中的操作会保留节点 ID，因此可以被服务端逆向映射到完整文档操作，再由 Yjs 完成并发合并和最终一致性维护。
