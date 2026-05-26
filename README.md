# 基于 Yjs 的支持隐私保护的结构化数据协同编辑器

本项目是课程设计第三题的原型实现。当前阶段已经完成 TypeScript + Yjs 项目骨架，并实现完整 JSON 树文档层的基础操作。

## 当前进度

- 第一阶段：项目需求边界与总体架构设计。
- 第二阶段：Yjs 完整 JSON 树数据模型设计。
- 第三阶段：RBAC + ABAC 访问控制策略与隐私视图生成规则设计。
- 第四阶段：TypeScript + Yjs 项目骨架与完整文档层基础操作。
- 第五阶段：访问控制层、隐私视图生成层和视图操作逆向映射。
- 第六阶段：服务端 HTTP / WebSocket 协同接口；难点 3 阶段一的视图操作信封。
- 难点 3 阶段二：批量操作同步接口，为离线队列重放做准备。
- 难点 3 阶段三：前端离线操作队列，支持断线后继续编辑并在重连后同步。
- 难点 3 阶段四：冲突处理策略，覆盖并发添加、字段级更新、删除优先和隐藏字段更新冲突。
- 难点 3 阶段五：专项并发视图同步测试，覆盖离线重连、权限变化和异构视图合并。
- 难点 3 阶段六：文档化一致性性质，包括无更新丢失、隐私安全、写回安全、最终投影一致性和删除优先。

## 技术栈

- TypeScript
- Yjs
- Vitest

## 目录结构

```text
docs/
  01-requirements-and-architecture.md
  02-yjs-json-tree-data-model.md
  03-access-control-and-view-transform.md

src/
  access-control/
    policy.ts
  crdt/
    document.ts
    operations.ts
    snapshot.ts
  fixtures/
    sample.ts
  view/
    transform.ts
  index.ts
  types.ts

tests/
  crdt-operations.test.ts
  view-transform.test.ts
```

## 安装与运行

推荐使用本机已有的 conda 环境：

```bash
conda activate crdt-editor
npm install
npm run typecheck
npm test
npm run build
```

如果默认 npm registry 下载较慢，可以使用：

```bash
npm install --registry=https://registry.npmmirror.com
```

## 已实现能力

完整文档层基于以下 Yjs 顶层结构：

```text
Y.Doc
  ├── meta
  ├── nodes
  ├── rootIds
  └── tombstones
```

当前已经支持：

- 创建完整 CRDT 文档。
- 添加节点。
- 删除节点及其子树。
- 重命名节点。
- 修改节点内容。
- 修改节点属性。
- 导出完整文档快照。
- 构造示例文档。
- 通过 Yjs update 验证副本收敛。
- 基于 RBAC + ABAC 判断节点可见性和编辑权限。
- 生成用户专属隐私视图。
- 校验用户视图操作。
- 将合法视图操作逆向映射为完整文档操作。
- 通过 HTTP 获取用户隐私视图和提交视图操作。
- 通过 WebSocket 推送初始视图和文档更新后的用户视图。
- 为视图操作增加 `ViewOperationEnvelope`，记录操作 ID、用户、产生时的 Yjs 状态向量和时间。
- 服务端支持按操作 ID 去重，重复提交同一个 envelope 不会重复写入完整文档。
- 支持 `POST /api/operations/batch` 批量提交视图操作，单批内可部分成功、部分失败。
- 前端支持添加子节点、删除节点、重命名、修改内容等基本编辑操作。
- 前端维护未确认操作队列，显示队列长度，并通过 `localStorage` 在页面刷新后保留离线操作。
- 支持手动或重连后自动同步离线操作。
- 合并后执行冲突整理，保证 tombstone 删除优先、悬挂子节点被删除、父子引用被清理。
- 禁止复用已经进入 tombstone 的节点 ID，避免删除节点被同 ID 复活。
- 新增 `tests/concurrent-view-sync.test.ts`，验证完整文档层和用户视图层在并发同步后重新对齐。
- 在 `docs/06-difficulty-3-concurrent-sync-plan.md` 中定义并追踪难点 3 的一致性性质。

## 服务端接口

构建并启动服务：

```bash
conda activate crdt-editor
npm run build
npm start
```

默认监听：

```text
http://localhost:3000
```

HTTP 接口：

```text
GET  /health
POST /api/login
POST /api/logout
GET  /api/session
GET  /api/users                  # admin only
PATCH /api/users/:userId         # admin only，变更后会使旧会话失效
GET  /api/view                   # 需要 Authorization: Bearer <token>
POST /api/operations             # 需要 Authorization: Bearer <token>
POST /api/operations/batch       # 需要 Authorization: Bearer <token>
```

登录示例：

```json
{
  "userId": "u-dev-manager"
}
```

响应会返回服务端签发的会话 token。后续请求必须携带：

```text
Authorization: Bearer <token>
```

`POST /api/operations` 请求示例：

推荐使用 envelope 格式：

```json
{
  "envelope": {
    "id": "op-001",
    "baseStateVector": "base64-state-vector",
    "createdAt": 1710000000000,
    "operation": {
      "type": "addNode",
      "parentId": "node-dev-plan",
      "title": "接口设计",
      "content": "接口草案"
    }
  }
}
```

为了兼容早期阶段，也仍然支持单个 `ViewOperation`：

```json
{
  "operation": {
    "type": "addNode",
    "parentId": "node-dev-plan",
    "title": "接口设计",
    "content": "接口草案"
  }
}
```

`POST /api/operations/batch` 请求示例：

```json
{
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

响应会区分成功、重复跳过和失败的操作：

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

WebSocket 接口：

```text
ws://localhost:3000/ws?token=<token>
```

客户端连接后会收到当前用户的初始隐私视图。客户端发送如下消息可提交视图操作：

```json
{
  "type": "operation",
  "envelope": {
    "id": "op-ws-001",
    "baseStateVector": "base64-state-vector",
    "createdAt": 1710000000000,
    "operation": {
      "type": "renameNode",
      "nodeId": "node-dev-plan",
      "title": "新的研发计划"
    }
  }
}
```

## 下一阶段

下一阶段将实现前端协同编辑界面：

- 展示当前用户的隐私视图树。
- 提供添加、删除、重命名、修改内容等操作。
- 通过 HTTP / WebSocket 与服务端协同。
- 支持切换不同用户观察隐私视图差异。
