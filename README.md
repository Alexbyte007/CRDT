# Privacy-Preserving CRDT Tree Editor

基于 Yjs 的隐私保护树形协同编辑器。项目面向结构化文档协同场景：服务端保存一份完整 CRDT 文档，不同用户只获得按权限投影后的隐私视图；用户在视图中的操作会经过服务端权限校验后写回完整文档。

## 核心能力

- **树形结构文档**：固定为三级结构，一级项目空间、二级模块/工作包、三级任务节点。
- **任务结构化属性**：三级任务支持优先级、经费预算、任务状态和 Markdown 内容。
- **隐私视图投影**：通过 `getView` 按 RBAC + 节点级 ACL 生成用户视图，不泄露不可见节点标题、内容和属性。
- **非同构视图**：不可见中间节点会被折叠，可见后代提升到最近可见祖先下，不再显示“受限路径”虚拟节点。
- **逆向写回**：通过 `putOperation` 将视图操作映射回完整 CRDT 树中的真实节点，并在服务端重新校验权限。
- **结构化筛选与聚合**：二级模块可筛选其下三级任务，并统计任务数、优先级分布、预算总额和平均预算。
- **批量结构化更新**：可对当前筛选结果批量设置优先级、预算或任务状态，实际生成多个 `updateAttrs` 操作写回真实节点。
- **实时协同**：通过 WebSocket 推送用户视图更新，Markdown 内容底层使用 `Y.Text` 提升并发文本合并效果。
- **可靠离线队列**：离线操作先进入本地持久化队列，重连后批量同步；服务端逐条重校验，返回 applied / skipped / rejected。
- **心跳与自动重连**：客户端通过 ping/pong 判断连接健康状态，网络恢复后自动同步离线队列。
- **删除影响分析**：删除父节点前分析受影响子树；遇到用户无权删除的后代节点时，需要高级删除冲突权限才能选择处理策略。
- **删除优先与墓碑**：删除节点进入 tombstone，离线迟到修改不会复活已删除节点；长期 tombstone GC 会清理过期且未被 undo/redo 引用的墓碑。
- **撤销/重做**：服务端维护按会话隔离的 undo/redo 栈，支持新增、修改、删除等操作的撤销重做。
- **用户管理**：支持注册、密码登录、管理员升级/降级/删除用户，删除或降级后旧会话失效。
- **SQLite 持久化**：文档、用户账号和权限配置可在服务重启后保留。

## 技术栈

- TypeScript
- Yjs
- WebSocket (`ws`)
- SQLite CLI 持久化
- Vitest
- Docker / Docker Compose

## 数据模型

完整文档由服务端保存为一份 Yjs 文档：

```text
Y.Doc
  meta        文档元信息
  nodes       Y.Map<NodeId, Y.Map>，扁平化保存所有活跃节点
  rootIds     Y.Array<NodeId>，根节点顺序
  tombstones  Y.Map<NodeId, Y.Map>，已删除节点墓碑
```

节点主要字段：

```ts
{
  id: string;
  parentId: string | null;
  title: string;
  content: string;        // 底层以 Y.Text 保存
  attrs: {
    priority?: "A" | "B" | "C";
    budget?: number;
    taskStatus?: "todo" | "doing" | "done";
  };
  acl: {
    visibility: string;
    allowedRoles: string[];
    contentEditableRoles: string[];
    childAddableRoles: string[];
    deletableRoles: string[];
    advancedPermissions?: {
      deleteConflictResolverUserIds?: string[];
    };
  };
  children: string[];
}
```

## 默认账号

| 身份 | 用户名 | 密码 |
| --- | --- | --- |
| 管理员 | `admin` | `admin123` |
| 研发经理 | `manager` | `manager123` |
| 研发人员 | `member` | `member123` |
| 访客 | `guest` | `guest123` |

新注册账号默认是访客，管理员可以在用户管理中调整身份。

## 本地运行

```bash
npm install
npm run typecheck
npm test
npm start
```

默认入口：

```text
http://localhost:3000
```

可通过环境变量修改：

```bash
HOST=0.0.0.0 PORT=3000 DATABASE_PATH=data/crdt.sqlite DOC_ID=doc-sample npm start
```

## Docker 部署

构建并启动：

```bash
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

当前 `docker-compose.yml` 默认暴露：

```text
http://服务器地址:3001
```

持久化数据位于宿主机 `./data` 目录。

## 常用脚本

```bash
npm run typecheck   # TypeScript 类型检查
npm test            # Vitest 全量测试
npm run build       # 编译检查
npm start           # 启动服务
```

当前测试覆盖 CRDT 操作、隐私视图投影、逆向写回、权限校验、离线重连、删除冲突、撤销重做、前端页面关键逻辑等模块。最近一次全量测试为 13 个测试文件、105 个测试通过。

## 主要接口

```text
GET  /health
POST /api/register
POST /api/login
POST /api/logout
GET  /api/session
GET  /api/users                  # admin only
PATCH /api/users/:userId         # admin only
DELETE /api/users/:userId        # admin only
GET  /api/view
POST /api/operations
POST /api/operations/batch
POST /api/delete-impact
POST /api/undo
POST /api/redo
```

WebSocket：

```text
ws://localhost:3000/ws?token=<token>
```

所有需要登录的接口均使用：

```text
Authorization: Bearer <token>
```

## 协同写回流程

```text
用户在隐私视图中编辑
  -> 前端生成 ViewOperation
  -> 操作进入本地可靠队列
  -> 在线时立即发送，离线时等待重连
  -> 服务端校验用户、节点状态、可见性和操作权限
  -> putOperation 转成完整文档操作
  -> 写入 Y.Doc
  -> 按各用户权限重新 getView 并广播
```

系统不会让客户端直接修改完整文档，也不会用整份视图覆盖完整状态。

## 结构化操作与逆向写回

筛选和聚合是只读正向计算，只基于当前用户视图中的可见任务节点。

批量更新筛选结果时，系统会：

```text
当前筛选结果
  -> 提取真实 nodeId
  -> 为每个可编辑任务生成 updateAttrs
  -> 逐条进入离线队列和服务端权限校验
  -> 写回完整 CRDT 树
```

因此批量结构化更新不会修改临时筛选列表，而是映射回真实节点集合。

## 目录结构

```text
src/
  access-control/   权限策略与判定
  crdt/             Yjs 文档封装、节点操作、冲突整理、tombstone GC
  fixtures/         示例文档与内置账号
  server/           HTTP、WebSocket、离线同步、撤销重做、用户管理
  view/             getView / putOperation 隐私视图变换
  types.ts          核心类型定义

tests/
  *.test.ts         单元测试与页面逻辑测试
```

## 说明

本项目采用可信服务端架构：服务端持有完整 Yjs 文档，客户端只接收自身权限范围内的投影视图。当前版本适合单个 Node 服务实例承载多人协同访问；SQLite + 内存会话 + 单进程 WebSocket 不适合直接多实例负载均衡。
