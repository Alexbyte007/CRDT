# Multi-Group Isolation — Implementation Guide

This document explains every file change needed to implement the
"multi-group department isolation" feature (dev group + test group).

---

## Why no policy change is needed

`config/policies.json` already contains the exact rule that enforces
department isolation:

```json
{
  "name": "department nodes require same department",
  "match": "node.acl.visibility == 'department'
            and node.attrs.status == 'active'
            and (user.department == node.attrs.department
                 or node.attrs.department == 'all')
            and includes(node.acl.allowedRoles, user.role)",
  "visible": true
}
```

A test-group node with `attrs.department == "test"` is therefore
**automatically invisible** to a dev-group user whose
`user.department == "dev"` — no extra rule is needed.

The `put.operationRules` similarly gate writes on `canViewNode`, so a
user who cannot see a node also cannot write to it.

---

## File 1 — `src/fixtures/sample.ts`  (REPLACE)

Replace the entire file with `src/fixtures/sample.ts` from this PR.

### Summary of changes

| Change | Detail |
|--------|--------|
| `u-dev-manager` name | `"研发经理"` → `"研发组长"` |
| **New user** `u-test-manager` | `role: "manager"`, `department: "test"` |
| **New user** `u-test-member` | `role: "member"`, `department: "test"` |
| **New node** `node-dev-requirements` | Dev group, editable by member |
| **New node** `node-test-announcement` | Test group, editable by manager |
| **New node** `node-test-plan` | Test group, editable by member |
| **New node** `node-test-bugs` | Test group, editable by member |

New node ACL pattern (test group nodes):

```typescript
{
  visibility: "department",          // ← triggers department rule
  allowedRoles: ["admin","manager","member"],
  editableRoles: ["admin","manager","member"],  // or manager-only for announcement
  contentEditableRoles: [...],
  childAddableRoles: [...],
  deletableRoles: ["admin","manager"],
}
attrs: {
  department: "test",   // ← must match user.department for non-admin
  status: "active"
}
```

---

## File 2 — `tests/multi-group-isolation.test.ts`  (NEW FILE)

Drop this file into your `tests/` directory as-is.

### Test matrix covered

| User | Sees dev nodes | Sees test nodes | Sees public | Cross-write rejected |
|------|:-:|:-:|:-:|:-:|
| u-admin | ✓ | ✓ | ✓ | n/a |
| u-dev-manager | ✓ | ✗ | ✓ | ✓ |
| u-dev-member | ✓ | ✗ | ✓ | ✓ |
| u-test-manager | ✗ | ✓ | ✓ | ✓ |
| u-test-member | ✗ | ✓ | ✓ | ✓ |
| u-guest | ✗ | ✗ | ✓ | n/a |

Cross-write operations tested:
- `renameNode` on opposite-group node → `AccessControlError`
- `updateContent` on opposite-group node → `AccessControlError`
- `deleteNode` on opposite-group node → `AccessControlError`
- `addNode` with `parentId` pointing to opposite-group node → `AccessControlError`

Post-write view symmetry tests:
- test member adds child to test node → visible to test manager, invisible to dev member
- dev member adds child to dev node → visible to dev manager, invisible to test member
- admin updates test node → test member sees new content, dev member still can't see the node

---

## File 3 — `tests/view-transform-multigroup-additions.test.ts`  (OPTIONAL)

These tests duplicate the critical cross-group assertions from
`multi-group-isolation.test.ts` in a form that slots into your existing
`view-transform.test.ts` describe-block style.

Either:
- Drop the file as a standalone extra test file, **or**
- Copy the individual `describe` blocks into your existing
  `tests/view-transform.test.ts`.

Both options work; Vitest will pick up either.

---

## No other files require changes

| File | Status |
|------|--------|
| `config/policies.json` | ✅ Unchanged — department rule already correct |
| `src/types.ts` | ✅ Unchanged — no new roles or types |
| `src/access-control/policy-engine.ts` | ✅ Unchanged |
| `src/view/transform.ts` | ✅ Unchanged |
| `src/crdt/operations.ts` | ✅ Unchanged |
| Server login/session code | Update UI user-list to include new users (see below) |

---

## Server / frontend: surfacing new users in the login dropdown

Wherever your server reads `sampleUsers` (or builds the login page user
list), the two new users will appear automatically after the
`src/fixtures/sample.ts` update because the login UI already iterates
`sampleUsers`.

If your server has a **static HTML** login page with hard-coded `<option>`
elements, add:

```html
<option value="u-test-manager">测试组长</option>
<option value="u-test-member">测试成员</option>
```

---

## Running the new tests

```bash
npm test -- --reporter=verbose tests/multi-group-isolation.test.ts
```

Or run the full suite to confirm nothing regressed:

```bash
npm test
```

Expected result:

```
✓ tests/multi-group-isolation.test.ts (29 tests)
✓ tests/view-transform-multigroup-additions.test.ts (10 tests)
... (all existing tests still pass)
```
