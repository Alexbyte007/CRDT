# 难点 3：异构数据上的并发更新同步实现规划

## 1. 难点说明

PPT 中的难点 3 是：

> 如何同步异构数据上的并发更新？

在本项目中，“异构数据”指的是：

```text
完整数据 s：
  服务端保存的完整 Yjs CRDT 文档，包含所有节点和字段。

用户视图 v：
  根据用户权限由 getView(s, user) 生成的隐私视图，只包含用户可见的数据子集。
```

难点在于：完整文档和用户视图并不是同构副本。用户只看到部分数据，但用户的编辑最终仍然要写回完整文档，并和其他用户或管理员的并发编辑正确合并。

需要保证：

```text
1. 没有更新丢失
2. 并发操作互不干扰
3. 隐私策略始终生效
4. 最终完整文档和用户视图重新对齐
```

最终目标可以表示为：

```text
s_final = merge(s1, s2, ...)
v_final = getView(s_final, user)
```

也就是说，完整文档通过 Yjs 合并达到最终一致后，每个用户最终看到的视图都应当是合并后完整文档的合法投影。

## 2. 当前实现状态

当前项目已经实现了在线版本的基础同步链路：

```text
用户视图操作
  -> putOperation 映射为完整文档操作
  -> applyFullDocOperation 写入 Yjs 文档
  -> WebSocket 通知各用户
  -> 每个用户重新 getView 得到最新隐私视图
```

当前已经支持：

- 在线多用户协同编辑。
- 不同用户看到不同隐私视图。
- 合法视图操作写回完整 Yjs 文档。
- WebSocket 推送更新后的用户视图。
- 基础 Yjs update 合并测试。

当前尚未完整实现：

- 离线编辑后的重连同步。
- 用户视图操作的版本上下文。
- 隐藏字段更新与可见结构删除之间的专项冲突处理。
- 并发场景下的系统性测试。
- 视图操作日志和批量同步接口。

因此，难点 3 可以分阶段完成。

## 3. 总体设计思路

本项目采用“完整文档层统一合并，视图层重新投影”的策略。

核心原则：

```text
1. 所有用户操作最终都必须映射回完整文档层。
2. Yjs 负责完整文档层的 CRDT 合并。
3. 隐私策略不参与 Yjs 内部合并，而是在写回前和投影时生效。
4. 每次完整文档变化后，用户视图都通过 getView 重新生成。
5. 视图侧离线操作以操作日志形式保存，重连后逐条校验和写回。
```

整体流程：

```text
用户视图 v
  -> 产生 viewOperation
  -> 封装为 ViewOperationEnvelope
  -> 在线时立即提交，离线时进入本地队列
  -> 服务端接收后校验权限
  -> putOperation 映射为 FullDocOperation
  -> 写入完整 Yjs 文档
  -> Yjs 合并并更新完整文档状态
  -> 对每个用户重新 getView
```

## 4. 阶段一：引入视图操作信封

当前实现状态：已完成。

对应代码位置：

- `src/types.ts`：新增 `ViewOperationEnvelope`。
- `src/crdt/state-vector.ts`：提供 Yjs 状态向量的 base64 编码工具。
- `src/server/operations.ts`：集中处理 envelope 去重、权限校验、put 映射和写回。
- `src/server/http.ts`：`GET /api/view` 返回 `stateVector`，`POST /api/operations` 支持 envelope 和旧 operation 格式。
- `src/server/websocket.ts`：WebSocket 初始视图、广播视图和操作确认均返回 `stateVector`，并支持 envelope 操作消息。
- `src/server/page.ts`：演示页面提交操作时会自动生成 envelope。
- `tests/server.test.ts`：覆盖 HTTP envelope 去重和 WebSocket envelope 提交。

### 4.1 目标

为每个用户视图操作增加上下文信息，使服务端知道该操作产生时用户基于哪个文档状态。

### 4.2 新增数据结构

```ts
export interface ViewOperationEnvelope {
  id: string;
  userId: string;
  baseStateVector: string;
  createdAt: number;
  operation: ViewOperation;
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `id` | 操作唯一 ID，用于去重 |
| `userId` | 操作发起用户 |
| `baseStateVector` | 操作产生时完整 Yjs 文档的状态向量 |
| `createdAt` | 操作产生时间 |
| `operation` | 原始用户视图操作 |

### 4.3 服务端处理逻辑

```text
receiveEnvelope(envelope):
  1. 检查 operationId 是否已经处理过
  2. 根据 userId 查找用户
  3. 根据当前完整文档查找目标节点
  4. 执行 validateViewOperation
  5. 执行 putOperation
  6. 写入 Yjs 完整文档
  7. 记录 operationId
  8. 返回最新用户视图
```

### 4.4 阶段产出

- 新增 `ViewOperationEnvelope` 类型。
- 新增服务端操作去重集合。
- HTTP / WebSocket 支持 envelope 格式。
- 保持兼容旧的单个 `ViewOperation`。

### 4.5 当前接口格式

`GET /api/view?userId=u-dev-manager` 返回：

```json
{
  "view": {},
  "stateVector": "base64-state-vector"
}
```

`POST /api/operations` 推荐请求：

```json
{
  "envelope": {
    "id": "op-001",
    "userId": "u-dev-manager",
    "baseStateVector": "base64-state-vector",
    "createdAt": 1710000000000,
    "operation": {
      "type": "addNode",
      "parentId": "node-dev-plan",
      "title": "新节点"
    }
  }
}
```

响应：

```json
{
  "ok": true,
  "view": {},
  "operationId": "op-001",
  "deduplicated": false,
  "stateVector": "new-base64-state-vector"
}
```

如果同一个 `operationId` 重复提交，服务端返回 `deduplicated: true`，并返回当前最新用户视图，但不会再次写入完整文档。

## 5. 阶段二：实现批量操作同步接口

当前实现状态：已完成。

对应代码位置：

- `src/server/types.ts`：新增批量请求、响应和拒绝结果类型。
- `src/server/operations.ts`：新增 `applyBatchViewOperationRequest`，逐条复用单操作 envelope 处理流程。
- `src/server/http.ts`：新增 `POST /api/operations/batch`。
- `tests/server.test.ts`：覆盖批量操作中的成功应用、重复跳过和权限拒绝。

### 5.1 目标

支持用户一次性提交多个视图操作，为后续离线队列同步做准备。

### 5.2 新增 HTTP 接口

```text
POST /api/operations/batch
```

请求示例：

```json
{
  "userId": "u-dev-manager",
  "operations": [
    {
      "id": "op-001",
      "baseStateVector": "base64-state-vector",
      "createdAt": 1710000000000,
      "operation": {
        "type": "addNode",
        "parentId": "node-dev-plan",
        "title": "离线新增节点"
      }
    }
  ]
}
```

响应示例：

```json
{
  "ok": true,
  "applied": ["op-001"],
  "skipped": [],
  "rejected": [],
  "view": {},
  "stateVector": "new-base64-state-vector"
}
```

### 5.3 批量处理策略

```text
for each envelope in operations:
  if operationId 已处理:
    记录 skipped
  else if 权限校验失败:
    记录 rejected
  else:
    写入完整文档
    记录 applied

返回最新 getView(fullDoc, user)
```

### 5.4 阶段产出

- 新增批量同步接口。
- 新增批量同步测试。
- 支持部分成功、部分失败。

### 5.5 当前接口格式

请求：

```json
{
  "userId": "u-dev-manager",
  "operations": [
    {
      "id": "op-001",
      "baseStateVector": "base64-state-vector",
      "createdAt": 1710000000000,
      "operation": {
        "type": "addNode",
        "parentId": "node-dev-plan",
        "title": "离线新增节点"
      }
    },
    {
      "id": "op-002",
      "baseStateVector": "base64-state-vector",
      "createdAt": 1710000000100,
      "operation": {
        "type": "renameNode",
        "nodeId": "node-finance",
        "title": "非法修改"
      }
    }
  ]
}
```

响应：

```json
{
  "ok": true,
  "applied": ["op-001"],
  "skipped": [],
  "rejected": [
    {
      "id": "op-002",
      "error": {
        "name": "AccessControlError",
        "message": "..."
      }
    }
  ],
  "view": {},
  "stateVector": "new-base64-state-vector"
}
```

说明：

- `applied`：本次实际写入完整 Yjs 文档的操作。
- `skipped`：operationId 已处理过的重复操作。
- `rejected`：权限校验、目标节点不存在、格式错误等导致失败的操作。
- `view`：批量处理后按当前权限重新生成的用户隐私视图。

## 6. 阶段三：实现前端离线操作队列

当前实现状态：已完成。

对应代码位置：

- `src/server/page.ts`：新增前端 `offline.connected` 和 `offline.queue` 状态。
- `src/server/page.ts`：页面显示 WebSocket 连接状态和当前用户离线队列长度。
- `src/server/page.ts`：用户操作统一封装为 `ViewOperationEnvelope`。
- `src/server/page.ts`：WebSocket 在线时发送 envelope，离线时保留在本地队列。
- `src/server/page.ts`：收到 WebSocket `operationApplied` 后移除已确认操作。
- `src/server/page.ts`：WebSocket 重连后自动调用 `POST /api/operations/batch` 同步当前用户队列。
- `src/server/page.ts`：提供“同步离线操作”按钮，可手动触发批量同步。
- `src/server/page.ts`：使用 `localStorage` 持久化未确认操作队列，页面刷新后仍可继续同步。
- `src/server/page.ts`：新增“删除节点”按钮，删除操作同样封装为 `ViewOperationEnvelope` 并支持离线队列。

### 6.1 目标

允许用户在 WebSocket 断开时继续编辑自己的视图，并在重连后同步操作。

### 6.2 前端新增状态

```ts
interface OfflineState {
  connected: boolean;
  queue: ViewOperationEnvelope[];
}
```

### 6.3 前端流程

```text
用户执行操作
  -> 如果 WebSocket 在线：
       立即发送 envelope
     如果 WebSocket 离线：
       存入 offlineQueue
       可选：本地乐观更新视图

WebSocket 重连
  -> POST /api/operations/batch
  -> 提交 offlineQueue
  -> 清空已应用操作
  -> 使用服务端返回的最新视图刷新页面
```

### 6.4 阶段产出

- 前端维护离线队列。
- 页面显示离线队列长度。
- 重连后自动同步。
- 用户可手动触发“同步离线操作”。

### 6.5 当前页面行为

页面左侧新增同步状态区域：

```text
连接状态：未连接 / 已连接
离线队列：N
同步离线操作
```

操作提交流程：

```text
点击重命名 / 改内容 / 添加子节点
  -> 创建 ViewOperationEnvelope
  -> 放入未确认队列
  -> 如果 WebSocket 已连接：
       发送 { type: "operation", envelope }
     否则：
       保留在离线队列中
```

确认与清理流程：

```text
WebSocket 收到 operationApplied
  -> 根据 operationId 从队列移除
  -> 更新 stateVector
  -> 刷新用户视图

手动同步或 WebSocket 重连
  -> POST /api/operations/batch
  -> applied / skipped / rejected 都从本地未确认队列移除
  -> 使用服务端返回的 view 和 stateVector 刷新页面
```

说明：

- 当前队列保存在页面内存中，适合课程演示“断开 WebSocket 后继续编辑，再重连同步”的流程。
- 当前队列同时写入 `localStorage`，刷新页面后会自动恢复未确认操作。
- 队列按 envelope 中的 `userId` 过滤显示和同步，切换用户不会把其他用户的离线操作误提交。

## 7. 阶段四：定义并实现冲突处理策略

当前实现状态：已完成。

对应代码位置：

- `src/crdt/conflicts.ts`：新增 `reconcileDocumentConflicts`，负责合并后的冲突整理。
- `src/crdt/operations.ts`：`applyFullDocOperation` 在写入后执行冲突整理。
- `src/crdt/operations.ts`：`addNode` 禁止复用已进入 tombstone 的节点 ID。
- `tests/conflict-resolution.test.ts`：覆盖四类冲突和 tombstone ID 复用保护。

### 7.1 目标

针对 PPT 中提到的“隐私策略应用”和“合并对齐”之间的微妙关系，明确本项目的冲突处理规则。

### 7.2 冲突类型一：并发添加 vs 添加

场景：

```text
用户 A 在同一父节点下添加节点 A1
用户 B 在同一父节点下添加节点 B1
```

处理策略：

```text
两个节点都保留。
顺序由 Yjs Y.Array 的 CRDT 规则决定。
```

预期结果：

```text
不会丢失任何新增节点。
```

实现说明：

```text
两个用户在同一父节点下并发 addNode 时，Yjs Array 合并两个插入。
测试只要求两个节点都存在，不依赖具体顺序。
```

### 7.3 冲突类型二：不同字段并发修改

场景：

```text
管理员修改 node.attrs.confidentialLevel
研发经理修改 node.title
```

处理策略：

```text
字段不同，两个修改都保留。
合并后重新 getView。
如果权限变化导致用户不再可见，则视图中隐藏该节点。
```

实现说明：

```text
不同字段分别写入 Y.Map 的不同 key。
合并后完整文档保留两个字段变更。
用户视图不缓存旧结果，而是重新执行 getView。
```

### 7.4 冲突类型三：删除节点 vs 修改节点

场景：

```text
用户 A 删除节点
用户 B 修改同一节点内容
```

处理策略：

```text
删除优先。
节点从 active nodes 移入 tombstones。
后续对该节点的视图操作被拒绝或忽略。
```

理由：

```text
如果节点已经被删除，则视图侧修改不应使节点复活。
```

实现说明：

```text
删除操作把节点从 active nodes 移入 tombstones。
reconcileDocumentConflicts 会保证 tombstone 优先：
  如果同一 nodeId 同时出现在 active nodes 和 tombstones，则删除 active nodes 中的版本。
  如果 active node 的 parentId 已经在 tombstones 中，则该子节点也进入 tombstones。
  rootIds 和 children 中指向 tombstone 的引用会被清理。
addNode 禁止复用 tombstone 中已有的 nodeId。
```

### 7.5 冲突类型四：隐藏字段更新 vs 可见结构删除

这是 PPT 中重点提到的冲突。

场景：

```text
完整文档侧：
  管理员修改普通用户不可见字段，例如 confidentialLevel 或 salary。

用户视图侧：
  普通用户删除自己可见的节点。
```

处理策略：

```text
如果用户删除的是整个节点：
  删除优先，隐藏字段更新随节点进入 tombstone。

如果用户只是修改可见字段：
  隐藏字段更新保留，可见字段修改也保留。
```

预期结果：

```text
完整文档最终状态唯一。
用户最终视图通过 getView(s_final, user) 重新计算。
不会出现完整文档和视图无法对齐的情况。
```

实现说明：

```text
隐藏字段更新和可见结构删除并发时，以结构删除为准。
如果最终节点进入 tombstone，则该节点不再出现在 active nodes 中。
用户视图只从 active nodes 投影，因此不会看到已删除节点。
如果只是修改可见字段，没有结构删除，则隐藏字段更新和可见字段更新都保留。
```

## 8. 阶段五：增加难点 3 专项测试

当前实现状态：已完成。

对应代码位置：

- `tests/concurrent-view-sync.test.ts`：新增难点 3 专项测试。
- `tests/conflict-resolution.test.ts`：保留底层冲突整理测试，两者共同验证完整文档层和视图层对齐。

### 8.1 新增测试文件

```text
tests/concurrent-view-sync.test.ts
```

当前测试覆盖：

```text
1. manager 和 admin 在同一父节点下并发添加，合并后两个节点都存在。
2. admin 修改 confidentialLevel，manager 修改 title，合并后两个字段都存在，并重新 getView。
3. admin 修改 content，manager 删除同一节点，最终删除优先。
4. admin 提高 node-module-a 密级，member 视图重新生成后隐藏该节点。
5. 用户离线添加节点，服务端同时发生管理员更新，重连批量同步后两类合法更新都保留。
```

### 8.2 测试场景一：并发添加不丢失

```text
manager 添加节点 A
admin 添加节点 B
同步后完整文档同时包含 A 和 B
```

### 8.3 测试场景二：隐藏字段和可见字段并发修改

```text
admin 修改 confidentialLevel
manager 修改 title
合并后两个修改都存在
重新 getView 后 manager 视图符合最新权限
```

### 8.4 测试场景三：删除优先

```text
admin 修改节点 content
manager 删除该节点
最终 active nodes 中不存在该节点
tombstones 中保留删除记录
```

### 8.5 测试场景四：权限变化导致视图变化

```text
admin 提高 node-module-a 密级
member 原先不可见或可见状态发生变化
合并后重新 getView
member 视图与最新权限一致
```

### 8.6 测试场景五：离线操作重连同步

```text
用户断开连接
用户本地添加节点
服务端同时发生管理员更新
用户重连提交离线队列
服务端合并所有合法操作
返回最新用户视图
```

## 9. 阶段六：在文档中定义一致性性质

当前实现状态：已完成。

本节用于最终报告，说明本项目在“完整 Yjs 文档层 + 用户隐私视图层”的异构同步模型下满足哪些一致性和安全性质。

记号约定：

```text
s：服务端完整 Yjs 文档状态
u：当前用户
v：用户收到的隐私视图
op：用户在视图上产生的 ViewOperation
fullOp：由 putOperation 生成的 FullDocOperation
```

最终报告中需要明确以下性质。

### 9.1 无更新丢失

```text
所有通过权限校验的 viewOperation 都会被转换为 fullDocOperation 并写入完整 Yjs 文档。
```

项目中的实现路径：

```text
ViewOperationEnvelope
  -> applyViewOperationRequest
  -> putOperation
  -> validateViewOperation
  -> applyFullDocOperation
  -> Yjs 完整文档
```

批量同步时，每个操作独立处理：

```text
合法操作进入 applied
重复操作进入 skipped
非法操作进入 rejected
```

因此，一个合法操作不会因为同批次中其他操作失败而丢失。离线重连场景中，前端保存未确认 envelope，重连后通过 `/api/operations/batch` 重新提交；服务端通过 operationId 去重，保证重试不会导致重复写入。

对应代码与测试：

- `src/server/operations.ts`：`applyViewOperationRequest`、`applyBatchViewOperationRequest`
- `tests/server.test.ts`：批量操作部分成功、重复跳过、失败拒绝
- `tests/concurrent-view-sync.test.ts`：离线操作重连同步

### 9.2 隐私安全

```text
任意时刻，用户收到的视图 v 都满足：
v = getView(s, user)
```

其中 `s` 是当前完整文档状态。

项目中的保证方式：

```text
完整文档只保存在服务端。
HTTP / WebSocket 不直接返回完整文档。
每次用户请求视图或文档发生变化后，服务端都重新执行 getView(s, user)。
```

也就是说，用户永远只收到由访问控制策略投影后的 `UserView`。如果管理员修改了密级、部门、状态等隐私相关字段，下一次返回给用户的视图会基于最新完整文档重新生成。

对应代码与测试：

- `src/view/transform.ts`：`getView`
- `src/server/http.ts`：`GET /api/view`
- `src/server/websocket.ts`：`broadcastViews`
- `tests/view-transform.test.ts`：不同用户得到不同视图
- `tests/concurrent-view-sync.test.ts`：权限变化后重新生成视图

### 9.3 写回安全

```text
任意用户操作 op 只有在 validateViewOperation 通过时才能写回完整文档。
```

项目中的实现路径：

```text
putOperation(crdt, user, op)
  -> validateViewOperation(crdt, user, op)
  -> canViewNode / canEditNode / sanitizeAttrsPatch
  -> 生成 fullDocOperation
```

如果用户伪造不可见节点 ID，或者尝试修改无权限字段，`validateViewOperation` 会抛出 `AccessControlError`，该操作不会进入 `applyFullDocOperation`。

属性更新采用字段级过滤：

```text
用户可编辑字段 -> 保留到 attrsPatch
用户不可编辑字段 -> 删除
过滤后为空 -> 拒绝写回
```

对应代码与测试：

- `src/view/transform.ts`：`validateViewOperation`、`putOperation`
- `src/access-control/policy-engine.ts`：RBAC + ABAC 策略解释
- `tests/view-transform.test.ts`：伪造不可见节点操作被拒绝、属性更新被过滤
- `tests/server.test.ts`：非法 HTTP 操作返回 `AccessControlError`

### 9.4 最终投影一致性

```text
完整文档合并达到 s_final 后，
用户最终视图为 getView(s_final, user)。
```

项目中的合并策略：

```text
所有合法用户操作最终映射到完整文档层。
Yjs 在完整文档层完成 CRDT 合并。
合并后执行 reconcileDocumentConflicts。
服务端对每个用户重新执行 getView(s_final, user)。
```

因此，用户视图不是独立副本，也不会长期保存旧投影结果。最终视图始终是最终完整文档状态的合法投影：

```text
v_final = getView(s_final, user)
```

对应代码与测试：

- `src/crdt/operations.ts`：`applyFullDocOperation`
- `src/crdt/conflicts.ts`：`reconcileDocumentConflicts`
- `src/view/transform.ts`：`getView`
- `tests/conflict-resolution.test.ts`：合并后冲突整理
- `tests/concurrent-view-sync.test.ts`：异构视图同步后重新对齐

### 9.5 删除优先

```text
如果节点被删除，则后续基于旧视图对该节点产生的操作不会使节点复活。
```

项目中的实现规则：

```text
deleteNode:
  active nodes -> tombstones
  从父节点 children 或 rootIds 中删除引用

reconcileDocumentConflicts:
  如果 nodeId 同时存在于 nodes 和 tombstones，tombstone 胜出
  如果 active node 的 parentId 已进入 tombstones，则该子节点也进入 tombstones
  清理 rootIds / children 中指向 tombstone 的引用

addNode:
  禁止复用 tombstone 中已有的 nodeId
```

因此，即使某个用户基于旧视图提交了对已删除节点的修改，该修改也不会让节点重新进入 active nodes。最终 `getView` 只从 active nodes 投影，用户不会看到已删除节点。

对应代码与测试：

- `src/crdt/operations.ts`：`deleteNode`、`addNode`
- `src/crdt/conflicts.ts`：删除优先冲突整理
- `tests/conflict-resolution.test.ts`：删除 vs 修改、父删除 vs 子新增、禁止复用 tombstone ID
- `tests/concurrent-view-sync.test.ts`：admin 修改 content 与 manager 删除同一节点时删除优先

### 9.6 性质汇总表

| 性质 | 实现机制 | 主要验证 |
| --- | --- | --- |
| 无更新丢失 | envelope、batch、operationId 去重、Yjs 写入 | `server.test.ts`、`concurrent-view-sync.test.ts` |
| 隐私安全 | 所有返回视图均由 `getView(s, user)` 生成 | `view-transform.test.ts` |
| 写回安全 | `validateViewOperation` 前置校验，非法操作拒绝 | `view-transform.test.ts`、`server.test.ts` |
| 最终投影一致性 | Yjs 合并后重新 `getView` | `conflict-resolution.test.ts`、`concurrent-view-sync.test.ts` |
| 删除优先 | tombstone、冲突整理、禁止 ID 复用 | `conflict-resolution.test.ts` |

## 10. 推荐实现顺序

建议按照以下顺序实现：

```text
1. ViewOperationEnvelope
2. operationId 去重
3. 批量操作接口 /api/operations/batch
4. concurrent-view-sync.test.ts
5. 删除优先和 tombstone 校验增强
6. 前端 offlineQueue
7. WebSocket 重连后自动同步
8. 文档中补充一致性性质说明
```

## 11. 最小可交付版本

如果时间有限，难点 3 的最小可交付版本建议做到：

```text
1. 增加 ViewOperationEnvelope
2. 增加 batch operations 接口
3. 增加并发添加、隐藏字段更新、删除优先三个测试
4. 报告中说明离线队列为后续扩展
```

这样可以较好回应 PPT 中的核心问题：

```text
没有更新丢失
并发操作互不干扰
隐私策略正确应用
最终视图重新投影对齐
```

## 12. 完整目标版本

完整版本应实现：

```text
1. 在线 WebSocket 协同
2. 离线视图操作队列
3. 重连后批量同步
4. operationId 去重
5. baseStateVector 记录操作上下文
6. 删除优先策略
7. 隐藏字段更新与可见字段更新的字段级合并
8. 权限变化后的视图重新投影
9. 难点 3 专项测试报告
```

完成后可以在汇报中表述为：

> 本系统将异构视图操作统一映射回完整 Yjs 文档层，由 Yjs 负责 CRDT 合并，并在合并后重新执行 getView 生成各用户隐私视图。系统通过操作信封、离线队列、批量同步和冲突处理策略，保证合法更新不丢失、隐私策略不被破坏，并最终实现完整文档与用户视图的投影一致性。
