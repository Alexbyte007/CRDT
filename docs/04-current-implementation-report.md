# 当前实现功能与技术说明

## 1. 项目概述

本项目实现了一个基于 Yjs 的支持隐私保护的结构化数据协同编辑器原型。系统以完整 JSON 树作为协同编辑对象，使用 Yjs 作为底层 CRDT 一致性引擎，在完整文档层之上实现 BX 风格的可配置隐私视图规则语言，并通过 RBAC + ABAC 混合访问控制策略生成用户视图。

项目核心目标是解决传统 CRDT 协同编辑中“所有用户默认同步完整数据视图”的隐私问题。当前实现中，完整 Yjs 文档只保存在服务端，普通用户客户端不会直接同步完整 `Y.Doc`，而是接收服务端根据用户权限生成的隐私视图。用户在视图中的操作会经过权限校验和逆向映射后写回完整文档。

## 2. 当前实现范围

当前版本已经实现以下主链路：

```text
完整 Yjs CRDT 文档
  -> BX 风格策略解释器执行 RBAC + ABAC 规则
  -> getView 生成用户隐私视图
  -> Web 页面展示用户视图树
  -> 用户提交视图操作
  -> validateViewOperation 权限校验
  -> putOperation 逆向映射为完整文档操作
  -> 写回 Yjs 完整文档
  -> HTTP / WebSocket 推送最新用户视图
```

当前版本属于支持离线队列的多视图协同编辑原型，已经可以演示多用户、多视图、权限隔离、基础 CRDT 合并和断线后重连同步能力。

## 3. 已实现需求对照

### 3.1 CRDT 协同核心

| 需求 | 当前实现情况 |
| --- | --- |
| 使用 CRDT 保证协同一致性 | 已实现，底层使用 Yjs |
| 支持结构化数据模型 | 已实现，支持 JSON 树结构 |
| 节点包含键值对或文本内容 | 已实现，每个节点包含 `title`、`content`、`attrs`、`acl` |
| 插入节点 | 已实现 |
| 删除节点 | 已实现，前端提供删除按钮 |
| 修改节点内容 | 已实现 |
| 移动节点 | 未实现，题目中为可选功能 |
| 并发编辑最终一致 | 基础能力已实现，依赖 Yjs 合并机制 |

### 3.2 隐私保护视图

| 需求 | 当前实现情况 |
| --- | --- |
| 完整数据转换为用户视图数据 | 已实现，函数为 `getView(crdt, user)` |
| 用户视图操作转换回完整数据操作 | 已实现，函数为 `putOperation(crdt, user, operation)` |
| 不同用户只能看到自己的视图 | 已实现 |
| 所有合法编辑最终写回完整文档 | 已实现 |
| 至少两种隐私策略 | 已实现，包含 RBAC 和 ABAC |
| 普通用户不直接接收完整 Yjs 文档 | 已实现 |
| 可配置视图变换规则 | 已实现，策略文件位于 `config/policies.json` |

### 3.3 协同编辑器前端/接口

| 需求 | 当前实现情况 |
| --- | --- |
| 提供文本或图形界面 | 已实现简单 Web 页面 |
| 展示当前用户视图树 | 已实现 |
| 添加子节点 | 已实现 |
| 重命名节点 | 已实现 |
| 修改节点内容 | 已实现 |
| 删除节点 | 已实现 |
| HTTP 接口 | 已实现 |
| WebSocket 同步 | 已实现 |

### 3.4 网络与同步

| 需求 | 当前实现情况 |
| --- | --- |
| 不依赖全局总顺序 | 核心文档层依赖 Yjs CRDT 合并，不依赖手写全局顺序 |
| 在线实时同步 | 已实现，WebSocket 推送最新隐私视图 |
| 断网编辑后重连同步 | 已实现，前端使用 `localStorage` 持久化离线队列，重连后批量同步 |

## 4. 系统架构

当前采用客户端-服务器架构。

```text
浏览器客户端
  |
  | HTTP / WebSocket
  v
服务端接口层
  |
  | 用户身份、视图操作
  v
访问控制层 RBAC + ABAC
  |
  | 可见性和可编辑性判断
  v
隐私视图变换层
  |
  | getView / putOperation
  v
Yjs 完整 CRDT 文档层
```

服务端是可信节点，保存完整 Yjs 文档。客户端只接收隐私视图，不保存完整 CRDT 文档。

## 5. 数据模型设计

完整文档使用 `Y.Doc` 表示，顶层结构如下：

```text
Y.Doc
  ├── meta: Y.Map
  ├── nodes: Y.Map<nodeId, Y.Map>
  ├── rootIds: Y.Array<nodeId>
  └── tombstones: Y.Map<nodeId, Y.Map>
```

每个节点包含：

```text
node
  ├── id
  ├── parentId
  ├── type
  ├── title
  ├── content
  ├── attrs
  ├── acl
  ├── children
  ├── createdBy
  ├── createdAt
  ├── updatedBy
  └── updatedAt
```

其中：

- `attrs` 表示节点业务属性，用于 ABAC 判断。
- `acl` 表示节点权限元数据，用于 RBAC 和显式授权。
- `children` 使用 `Y.Array` 保存子节点顺序。
- `nodes` 使用节点注册表结构，便于通过 `nodeId` 进行权限校验和逆向映射。

## 6. 用户与权限模型

当前定义四类用户角色：

```text
admin
manager
member
guest
```

用户模型：

```ts
interface User {
  id: string;
  name: string;
  role: "admin" | "manager" | "member" | "guest";
  department: string;
  clearanceLevel: number;
}
```

权限策略包含两部分。

### 6.1 RBAC

RBAC 根据用户角色判断基础操作能力。

| 角色 | 查看 | 添加 | 删除 | 重命名 | 修改内容 | 修改属性 |
| --- | --- | --- | --- | --- | --- | --- |
| admin | 全部 | 允许 | 允许 | 允许 | 允许 | 允许 |
| manager | 部分 | 允许 | 允许 | 允许 | 允许 | 部分允许 |
| member | 部分 | 允许 | 禁止 | 允许 | 允许 | 禁止 |
| guest | 公开 | 禁止 | 禁止 | 禁止 | 禁止 | 禁止 |

### 6.2 ABAC

ABAC 根据用户属性和节点属性判断访问权限。

当前使用的属性包括：

```text
user.department
user.clearanceLevel
node.attrs.department
node.attrs.ownerId
node.attrs.confidentialLevel
node.attrs.status
```

典型规则：

```text
用户部门与节点部门一致
用户密级 >= 节点密级
用户是节点 owner
节点状态为 active
```

## 7. 隐私视图变换

当前实现了轻量级双向视图变换机制。

### 7.1 正向变换

```ts
getView(crdt, user): UserView
```

功能：

- 从完整 Yjs 文档生成用户视图。
- 过滤用户无权访问的节点。
- 清洗用户无权查看的字段。
- 不向普通用户暴露完整 `acl`。
- 为每个视图节点生成 `permissions`，供前端判断按钮状态。

示例：

```text
管理员视图:
项目空间
  ├── 公开说明
  ├── 研发计划
  │   └── 模块 A 设计
  └── 财务预算

研发成员视图:
项目空间
  ├── 公开说明
  └── 研发计划

访客视图:
项目空间
  └── 公开说明
```

### 7.2 逆向映射

```ts
putOperation(crdt, user, viewOperation): FullDocOperation
```

功能：

- 接收用户视图操作。
- 重新在服务端校验权限。
- 将视图操作映射为完整文档操作。
- 添加节点时由服务端补全安全的 `attrs` 和 `acl`。
- 修改属性时过滤用户无权修改的字段。

### 7.3 权限校验

```ts
validateViewOperation(crdt, user, operation)
```

功能：

- 防止用户伪造视图操作修改不可见节点。
- 防止用户修改无权编辑的属性。
- 防止客户端绕过前端按钮直接调用接口。

## 8. 服务端接口

当前服务端使用 Node.js 原生 HTTP 和 `ws` WebSocket。

### 8.1 HTTP 接口

```text
GET  /
GET  /health
GET  /api/users
GET  /api/view?userId=u-dev-member
POST /api/operations
```

`GET /` 返回内置 Web 页面。

`GET /api/view` 返回指定用户的隐私视图。

`POST /api/operations` 接收用户视图操作，流程如下：

```text
接收 viewOperation
  -> 查找用户
  -> putOperation 权限校验和逆向映射
  -> applyFullDocOperation 写入 Yjs 文档
  -> 重新生成用户视图
  -> 返回最新视图
```

### 8.2 WebSocket 接口

```text
ws://localhost:3000/ws?userId=u-dev-manager
```

连接成功后，服务端立即推送当前用户的隐私视图。

客户端可以发送：

```json
{
  "type": "operation",
  "operation": {
    "type": "renameNode",
    "nodeId": "node-dev-plan",
    "title": "新的研发计划"
  }
}
```

服务端执行操作后，会向所有在线连接重新推送对应用户的最新隐私视图。

## 9. Web 页面功能

当前 Web 页面已经支持：

- 切换用户。
- 查看当前用户隐私视图树。
- 查看当前用户视图 JSON。
- 选择节点。
- 重命名节点。
- 修改节点内容。
- 添加子节点。
- 删除节点。
- 连接 WebSocket 接收实时更新。
- 在 WebSocket 断开时缓存离线操作。
- 使用 `localStorage` 保存未确认离线队列，页面刷新后仍可继续同步。

页面下方黑色 JSON 框展示的是当前用户实际收到的隐私视图数据，可用于证明普通用户客户端没有收到完整文档。

## 10. 测试情况

当前测试使用 Vitest。

测试文件：

```text
tests/crdt-operations.test.ts
tests/view-transform.test.ts
tests/policy-engine.test.ts
tests/server.test.ts
tests/conflict-resolution.test.ts
tests/concurrent-view-sync.test.ts
```

测试覆盖：

- 示例文档结构创建。
- 添加节点。
- 删除子树。
- 重命名节点。
- 修改内容和属性。
- Yjs update 交换后的副本收敛。
- admin / manager / member / guest 不同视图投影。
- 普通用户视图不暴露 `acl`。
- 越权视图操作被拒绝。
- 合法视图操作可映射回完整文档操作。
- HTTP 获取隐私视图。
- HTTP 提交操作。
- WebSocket 初始视图推送。
- WebSocket 操作后广播更新。
- 批量操作同步。
- 删除优先和 tombstone 冲突整理。
- 异构完整文档/用户视图并发同步。
- 离线操作重连同步。

当前测试结果：

```text
Test Files  6 passed
Tests       32 passed
```

## 11. 当前演示场景

推荐演示“多角色项目文档树”场景。

完整文档：

```text
项目空间
  ├── 公开说明
  ├── 研发计划
  │   └── 模块 A 设计
  └── 财务预算
```

演示步骤：

1. 打开两个浏览器窗口访问 `http://localhost:3000/`。
2. 一个窗口选择 `研发经理`，另一个窗口选择 `访客` 或 `管理员`。
3. 两个窗口都点击“连接 WS”。
4. 研发经理选择“研发计划”，添加子节点。
5. 管理员能看到新增节点。
6. 访客仍然只能看到公开内容。

该场景可以体现：

- 多用户协同编辑。
- 不同用户看到不同隐私视图。
- 合法操作写回完整 Yjs 文档。
- WebSocket 自动同步更新。
- 无权限用户无法获得隐藏节点。

## 12. 当前局限与待完善功能

当前项目已经完成在线多视图隐私协同编辑主链路，但仍有以下待完善点。

### 12.1 权限策略配置化

当前权限策略和示例用户主要写在代码中。后续可以增加：

```text
config/users.json
config/policies.json
config/sample-document.json
```

这样更符合“可配置隐私策略”的要求。

### 12.2 文档持久化

当前完整 Yjs 文档存储在内存中，服务重启后编辑数据会丢失。后续可使用 `Y.encodeStateAsUpdate` 保存到文件。

### 12.3 文本内容细粒度合并

当前 `content` 是普通字符串，两个用户同时修改同一内容时采用字段级覆盖语义。后续可将 `content` 替换为 `Y.Text`，支持更细粒度的文本 CRDT 合并。

### 12.4 身份认证

当前通过 `userId` 参数切换用户，适合课程演示。真实系统应接入登录认证、会话管理和权限令牌。

## 13. 当前结论

当前项目已经实现了题目要求中的核心原型：

> 基于 Yjs 保存完整 CRDT 文档，通过 BX 风格的可配置策略语言解释 RBAC + ABAC 规则，生成不同用户的隐私视图，并将用户视图操作经过权限校验和逆向映射后写回完整文档。系统支持在线多用户协同编辑、删除优先冲突处理、离线操作队列和重连批量同步，并通过 HTTP/WebSocket 提供可演示的 Web 原型。

后续重点应放在最终交付 PDF 整理、应用案例文档、文档持久化和更细粒度文本 CRDT 合并上。
