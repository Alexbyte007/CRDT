# BX 风格隐私视图规则语言设计

## 1. 设计目标

为了更好地回应 PPT 中“项目难点 2：如何设计正确的隐私保护机制”，当前项目将原先写在代码中的 RBAC + ABAC 权限逻辑升级为一套可配置的 BX 风格视图规则语言。

这套机制不是完整通用 BX 语言，但已经具备以下特征：

```text
策略文件
  -> 解释为 get 视图投影规则
  -> 解释为 put 写回约束规则
  -> 运行时生成不同用户的隐私视图
  -> 运行时过滤非法视图操作
```

对应 PPT 中的模型：

```text
s  -- get -->  v
v' -- put -->  s'
```

在本项目中：

```text
s  = 服务端完整 Yjs JSON 树文档
v  = 用户隐私视图
v' = 用户编辑后的视图操作
s' = 写入完整文档后的新状态
```

## 2. 策略文件

当前策略文件位于：

```text
config/policies.json
```

策略文件包含三部分：

```text
view.nodeRules   节点可见性规则
view.fieldRules  字段可见性规则
put.operationRules  操作写回规则
put.attrRules       属性写回规则
```

示例：

```json
{
  "name": "department nodes require same department and enough clearance",
  "match": "node.acl.visibility == 'department' and node.attrs.status == 'active' and user.department == node.attrs.department and user.clearanceLevel >= node.attrs.confidentialLevel",
  "visible": true
}
```

该规则表示：

```text
部门节点只有在用户部门一致、节点为 active 且用户密级足够时才可见。
```

## 3. 表达式语言

为了安全起见，项目没有使用 JavaScript `eval`。系统实现了一个受控表达式解释器：

```text
src/access-control/expression.ts
```

当前支持：

```text
== != > >= < <=
and / or / not
in
includes(array, value)
startsWith(value, prefix)
字符串、数字、布尔值、数组
user.xxx
node.xxx
field
value
```

示例表达式：

```text
user.role == 'admin'
node.attrs.department == user.department
user.clearanceLevel >= node.attrs.confidentialLevel
field in ['attrs.department', 'attrs.status']
includes(node.acl.allowedRoles, user.role)
startsWith(field, 'acl')
```

## 4. get 视图投影

`getView(crdt, user)` 会调用策略引擎判断节点和字段是否可见。

核心流程：

```text
完整文档节点
  -> nodeRules 判断节点是否可见
  -> fieldRules 判断字段是否可见
  -> 删除不可见节点和字段
  -> 生成用户专属 ViewNode
```

普通用户不会收到完整节点中的 `acl` 字段，也不会收到无权访问的节点。

例如：

```text
admin:
项目空间、公开说明、研发计划、模块 A 设计、财务预算

member:
项目空间、公开说明、研发计划

guest:
项目空间、公开说明
```

## 5. put 写回约束

`putOperation(crdt, user, viewOperation)` 会调用策略引擎判断用户能否写回操作。

核心流程：

```text
视图操作
  -> 定位完整文档中的目标节点
  -> operationRules 判断该操作是否允许
  -> attrRules 判断属性修改是否允许
  -> 生成完整文档操作
  -> 写入 Yjs 文档
```

示例操作规则：

```json
{
  "name": "manager can perform all operations on editable visible nodes",
  "match": "user.role == 'manager' and includes(node.acl.editableRoles, user.role)",
  "operations": ["addNode", "deleteNode", "renameNode", "updateContent", "updateAttrs"]
}
```

示例属性约束：

```json
{
  "name": "manager can edit limited attrs",
  "match": "user.role == 'manager'",
  "attrs": ["confidentialLevel", "tags", "status"],
  "constraints": [
    {
      "attr": "confidentialLevel",
      "match": "value <= node.attrs.confidentialLevel"
    }
  ]
}
```

该规则表示：

```text
manager 可以修改密级字段，但只能降低或保持密级，不能提高密级。
```

## 6. 策略引擎

策略解释器实现位置：

```text
src/access-control/policy-engine.ts
```

主要接口：

```ts
canViewNode(user, node)
canViewField(user, node, field)
canEditNode(user, node, operationType)
canEditAttr(user, node, attr, value)
sanitizeAttrsPatch(user, node, attrsPatch)
```

现有 `policy.ts` 作为兼容门面，继续向其他模块提供：

```ts
canViewNode
canEditNode
canViewField
sanitizeAttrsPatch
```

但这些函数的底层已经改为读取 `config/policies.json` 并由策略引擎解释执行。

## 7. 与 PPT 难点 2 的对应关系

PPT 中提出两类可能方案：

```text
1. 双向变换 Lens: get / put
2. 访问控制列表：根据权限过滤无权限操作
```

当前项目结合了两者：

```text
get:
  由 view.nodeRules 和 view.fieldRules 解释得到用户视图

put:
  由 put.operationRules 和 put.attrRules 约束用户操作写回

ACL / ABAC:
  策略表达式可以引用 node.acl、node.attrs 和 user 属性
```

因此当前难点 2 不再只是写死在代码里的轻量权限判断，而是一套可配置的视图变换机制。

## 8. 测试覆盖

新增测试文件：

```text
tests/policy-engine.test.ts
```

测试内容：

- 表达式解释器可以解释受控策略表达式。
- 修改策略配置可以改变节点可见性。
- 修改策略配置可以改变属性写回约束。

当前全量测试结果：

```text
Test Files  4 passed
Tests       18 passed
```

## 9. 当前边界

当前策略语言仍然是课程原型级设计，不是完整通用 BX 语言。

当前已经支持：

```text
配置化 get 投影
配置化 put 约束
节点级隐私
字段级隐私
操作级权限
属性级权限
```

暂未支持：

```text
任意用户自定义变换函数
完整视图 diff + putback
形式化自动证明 GetPut / PutGet
加密视图计算
```

不过对于课程项目和 PPT 难点 2 来说，当前实现已经可以表述为：

> 系统实现了一套 BX 风格的可配置隐私视图规则语言。策略文件被解释为正向视图投影 get 和逆向写回约束 put，从而使不同用户获得不同视图，并保证用户操作只能在权限允许范围内写回完整 CRDT 文档。
