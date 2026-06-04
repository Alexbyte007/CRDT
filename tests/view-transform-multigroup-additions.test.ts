/**
 * Additions to tests/view-transform.test.ts
 *
 * Paste these describe-blocks into your existing view-transform.test.ts,
 * or keep them here as a separate file — they only use the same helpers
 * (createSampleDocument, sampleUsers, getView, putOperation) that the
 * existing tests already import.
 *
 * New nodes expected in the sample document (added by this PR):
 *   node-dev-requirements  (department: dev,  visibility: department, editable by member)
 *   node-test-announcement (department: test, visibility: department, editable by manager only)
 *   node-test-plan         (department: test, visibility: department, editable by member)
 *   node-test-bugs         (department: test, visibility: department, editable by member)
 *
 * New users expected in sampleUsers:
 *   u-test-manager  (role: manager, department: test)
 *   u-test-member   (role: member,  department: test)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { getView } from "../src/view/transform";
import { putOperation } from "../src/view/transform";
import { AccessControlError } from "../src/types";
import type { CrdtDocument } from "../src/crdt/document";
import type { User } from "../src/types";

// Re-use the same helpers your existing view-transform.test.ts already has
// (copied here for completeness so this file can also stand alone).

function userById(id: string): User {
  const u = sampleUsers.find((u) => u.id === id);
  if (!u) throw new Error(`No sample user with id "${id}"`);
  return u as unknown as User;
}

function collectTitles(roots: ReturnType<typeof getView>["roots"]): string[] {
  const out: string[] = [];
  const walk = (nodes: typeof roots) => {
    for (const n of nodes) {
      out.push(n.title);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

// ── New tests ────────────────────────────────────────────────────────────────

let crdt: CrdtDocument;
beforeEach(() => {
  crdt = createSampleDocument();
});

describe("multi-group view isolation — dev group", () => {
  it("dev member sees dev nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-dev-member")).roots);
    expect(titles).toContain("研发计划");
    expect(titles).toContain("研发组需求文档");
  });

  it("dev member does not see test group nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-dev-member")).roots);
    expect(titles).not.toContain("测试组公告");
    expect(titles).not.toContain("测试计划");
    expect(titles).not.toContain("缺陷记录");
  });

  it("dev manager does not see test group nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-dev-manager")).roots);
    expect(titles).not.toContain("测试计划");
    expect(titles).not.toContain("缺陷记录");
  });
});

describe("multi-group view isolation — test group", () => {
  it("test member sees test nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-test-member")).roots);
    expect(titles).toContain("测试组公告");
    expect(titles).toContain("测试计划");
    expect(titles).toContain("缺陷记录");
  });

  it("test member does not see dev group nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-test-member")).roots);
    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("研发组需求文档");
  });

  it("test manager does not see dev group nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-test-manager")).roots);
    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("研发组需求文档");
  });
});

describe("multi-group view isolation — admin and guest", () => {
  it("admin sees both dev and test group nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-admin")).roots);
    expect(titles).toContain("研发计划");
    expect(titles).toContain("研发组需求文档");
    expect(titles).toContain("测试组公告");
    expect(titles).toContain("测试计划");
    expect(titles).toContain("缺陷记录");
  });

  it("guest sees only public nodes", () => {
    const titles = collectTitles(getView(crdt, userById("u-guest")).roots);
    expect(titles).toContain("公开说明");
    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("测试计划");
  });
});

describe("cross-group putOperation rejection", () => {
  it("dev member cannot rename a test node (AccessControlError)", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "renameNode",
        nodeId: "node-test-plan",
        title: "篡改"
      })
    ).toThrow(AccessControlError);
  });

  it("test member cannot rename a dev node (AccessControlError)", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "renameNode",
        nodeId: "node-dev-requirements",
        title: "篡改"
      })
    ).toThrow(AccessControlError);
  });

  it("dev member cannot add child under a test node (AccessControlError)", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "addNode",
        parentId: "node-test-plan",
        title: "越权节点"
      })
    ).toThrow(AccessControlError);
  });

  it("test member cannot update content of a dev node (AccessControlError)", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "updateContent",
        nodeId: "node-dev-requirements",
        content: "注入"
      })
    ).toThrow(AccessControlError);
  });
});
