/**
 * tests/multi-group-isolation.test.ts
 *
 * Verifies that the department-based privacy rules correctly isolate
 * the dev group and test group from each other, while admin sees
 * everything and guest sees only public nodes.
 *
 * Acceptance criteria from the issue:
 *   ✓ admin sees dev nodes, test nodes, and public nodes
 *   ✓ u-dev-member sees dev nodes + public, NOT test nodes
 *   ✓ u-test-member sees test nodes + public, NOT dev nodes
 *   ✓ u-guest sees only public nodes
 *   ✓ dev member cannot forge-write to a test node (AccessControlError)
 *   ✓ test member cannot forge-write to a dev node (AccessControlError)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { getView } from "../src/view/transform";
import { putOperation } from "../src/view/transform";
import { AccessControlError } from "../src/types";
import type { CrdtDocument } from "../src/crdt/document";
import type { User } from "../src/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function userById(id: string): User {
  const u = sampleUsers.find((u) => u.id === id);
  if (!u) throw new Error(`No sample user with id "${id}"`);
  // SampleUser satisfies User (id/name/role/department match)
  return u as unknown as User;
}

/** Collect all node titles in a view (depth-first). */
function collectTitles(roots: ReturnType<typeof getView>["roots"]): string[] {
  const titles: string[] = [];
  function walk(nodes: typeof roots): void {
    for (const n of nodes) {
      titles.push(n.title);
      walk(n.children);
    }
  }
  walk(roots);
  return titles;
}

// ── Fixture ──────────────────────────────────────────────────────────────────

let crdt: CrdtDocument;

beforeEach(() => {
  crdt = createSampleDocument();
});

// ── View isolation tests ─────────────────────────────────────────────────────

describe("admin view", () => {
  it("sees all department nodes including dev, test, and finance", () => {
    const view = getView(crdt, userById("u-admin"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");

    // Dev group
    expect(titles).toContain("研发计划");
    expect(titles).toContain("研发组需求文档");

    // Test group
    expect(titles).toContain("测试组公告");
    expect(titles).toContain("测试计划");
    expect(titles).toContain("缺陷记录");

    // Restricted finance
    expect(titles).toContain("财务预算");
  });
});

describe("dev member view", () => {
  it("sees public node and dev nodes", () => {
    const view = getView(crdt, userById("u-dev-member"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");
    expect(titles).toContain("研发计划");
    expect(titles).toContain("研发组需求文档");
  });

  it("does NOT see test group nodes", () => {
    const view = getView(crdt, userById("u-dev-member"));
    const titles = collectTitles(view.roots);

    expect(titles).not.toContain("测试组公告");
    expect(titles).not.toContain("测试计划");
    expect(titles).not.toContain("缺陷记录");
  });

  it("does NOT see the restricted finance node", () => {
    const view = getView(crdt, userById("u-dev-member"));
    const titles = collectTitles(view.roots);
    expect(titles).not.toContain("财务预算");
  });

  it("does NOT receive acl fields", () => {
    const view = getView(crdt, userById("u-dev-member"));
    function hasAcl(nodes: typeof view.roots): boolean {
      for (const n of nodes) {
        // acl should not be present, or at least not contain sensitive fields
        if ("deniedUsers" in (n.acl ?? {})) return true;
        if ("allowedUsers" in (n.acl ?? {})) return true;
        if (hasAcl(n.children)) return true;
      }
      return false;
    }
    expect(hasAcl(view.roots)).toBe(false);
  });
});

describe("dev manager view", () => {
  it("sees public node and dev nodes", () => {
    const view = getView(crdt, userById("u-dev-manager"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");
    expect(titles).toContain("研发计划");
    expect(titles).toContain("模块 A 设计");
    expect(titles).toContain("研发组需求文档");
  });

  it("does NOT see test group nodes", () => {
    const view = getView(crdt, userById("u-dev-manager"));
    const titles = collectTitles(view.roots);

    expect(titles).not.toContain("测试组公告");
    expect(titles).not.toContain("测试计划");
    expect(titles).not.toContain("缺陷记录");
  });
});

describe("test member view", () => {
  it("sees public node and test nodes", () => {
    const view = getView(crdt, userById("u-test-member"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");
    expect(titles).toContain("测试组公告");
    expect(titles).toContain("测试计划");
    expect(titles).toContain("缺陷记录");
  });

  it("does NOT see dev group nodes", () => {
    const view = getView(crdt, userById("u-test-member"));
    const titles = collectTitles(view.roots);

    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("模块 A 设计");
    expect(titles).not.toContain("研发组需求文档");
  });

  it("does NOT see the restricted finance node", () => {
    const view = getView(crdt, userById("u-test-member"));
    const titles = collectTitles(view.roots);
    expect(titles).not.toContain("财务预算");
  });
});

describe("test manager view", () => {
  it("sees public node and test nodes", () => {
    const view = getView(crdt, userById("u-test-manager"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");
    expect(titles).toContain("测试组公告");
    expect(titles).toContain("测试计划");
    expect(titles).toContain("缺陷记录");
  });

  it("does NOT see dev group nodes", () => {
    const view = getView(crdt, userById("u-test-manager"));
    const titles = collectTitles(view.roots);

    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("研发组需求文档");
  });
});

describe("guest view", () => {
  it("sees only public nodes", () => {
    const view = getView(crdt, userById("u-guest"));
    const titles = collectTitles(view.roots);

    expect(titles).toContain("公开说明");

    expect(titles).not.toContain("研发计划");
    expect(titles).not.toContain("研发组需求文档");
    expect(titles).not.toContain("测试组公告");
    expect(titles).not.toContain("测试计划");
    expect(titles).not.toContain("缺陷记录");
    expect(titles).not.toContain("财务预算");
  });
});

// ── Cross-group write attempts (must be rejected) ────────────────────────────

describe("cross-group write rejection", () => {
  it("dev member cannot rename a test group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "renameNode",
        nodeId: "node-test-plan",
        title: "恶意改名"
      })
    ).toThrow(AccessControlError);
  });

  it("dev member cannot update content of a test group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "updateContent",
        nodeId: "node-test-bugs",
        content: "注入内容"
      })
    ).toThrow(AccessControlError);
  });

  it("dev member cannot delete a test group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "deleteNode",
        nodeId: "node-test-announcement"
      })
    ).toThrow(AccessControlError);
  });

  it("test member cannot rename a dev group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "renameNode",
        nodeId: "node-dev-requirements",
        title: "篡改标题"
      })
    ).toThrow(AccessControlError);
  });

  it("test member cannot update content of a dev group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "updateContent",
        nodeId: "node-dev-plan",
        content: "篡改内容"
      })
    ).toThrow(AccessControlError);
  });

  it("test manager cannot delete a dev group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-manager"), {
        type: "deleteNode",
        nodeId: "node-dev-plan"
      })
    ).toThrow(AccessControlError);
  });

  it("dev member cannot add a child under a test group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "addNode",
        parentId: "node-test-plan",
        title: "越权子节点"
      })
    ).toThrow(AccessControlError);
  });

  it("test member cannot add a child under a dev group node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "addNode",
        parentId: "node-dev-requirements",
        title: "越权子节点"
      })
    ).toThrow(AccessControlError);
  });
});

// ── Intra-group writes (must succeed) ────────────────────────────────────────

describe("intra-group writes are permitted", () => {
  it("test member can rename a test node they can see", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "renameNode",
        nodeId: "node-test-plan",
        title: "更新后的测试计划"
      })
    ).not.toThrow();
  });

  it("test member can update content on a test node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "updateContent",
        nodeId: "node-test-bugs",
        content: "新的缺陷记录内容"
      })
    ).not.toThrow();
  });

  it("test member can add a child under a test node", () => {
    expect(() =>
      putOperation(crdt, userById("u-test-member"), {
        type: "addNode",
        parentId: "node-test-plan",
        title: "迭代一测试用例"
      })
    ).not.toThrow();
  });

  it("dev member can rename a dev node they can see", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "renameNode",
        nodeId: "node-dev-requirements",
        title: "v2 需求文档"
      })
    ).not.toThrow();
  });

  it("dev member can add a child under a dev node", () => {
    expect(() =>
      putOperation(crdt, userById("u-dev-member"), {
        type: "addNode",
        parentId: "node-dev-requirements",
        title: "新功能需求"
      })
    ).not.toThrow();
  });
});

// ── View symmetry after a write ──────────────────────────────────────────────

describe("view update after write", () => {
  it("test member adding a child to a test node is visible to test manager but not dev member", () => {
    putOperation(crdt, userById("u-test-member"), {
      type: "addNode",
      parentId: "node-test-plan",
      title: "冒烟测试用例"
    });

    const testManagerTitles = collectTitles(
      getView(crdt, userById("u-test-manager")).roots
    );
    const devMemberTitles = collectTitles(
      getView(crdt, userById("u-dev-member")).roots
    );

    expect(testManagerTitles).toContain("冒烟测试用例");
    expect(devMemberTitles).not.toContain("冒烟测试用例");
  });

  it("dev member adding a child to a dev node is visible to dev manager but not test member", () => {
    putOperation(crdt, userById("u-dev-member"), {
      type: "addNode",
      parentId: "node-dev-requirements",
      title: "性能优化需求"
    });

    const devManagerTitles = collectTitles(
      getView(crdt, userById("u-dev-manager")).roots
    );
    const testMemberTitles = collectTitles(
      getView(crdt, userById("u-test-member")).roots
    );

    expect(devManagerTitles).toContain("性能优化需求");
    expect(testMemberTitles).not.toContain("性能优化需求");
  });

  it("admin modifying a test node — test member sees change, dev member does not see the node", () => {
    putOperation(crdt, userById("u-admin"), {
      type: "updateContent",
      nodeId: "node-test-bugs",
      content: "管理员更新后的缺陷记录"
    });

    // Test member's view of that node should show updated content
    const testView = getView(crdt, userById("u-test-member"));
    function findNode(
      nodes: typeof testView.roots,
      title: string
    ): (typeof testView.roots)[0] | undefined {
      for (const n of nodes) {
        if (n.title === title) return n;
        const found = findNode(n.children, title);
        if (found) return found;
      }
      return undefined;
    }

    const bugNode = findNode(testView.roots, "缺陷记录");
    expect(bugNode).toBeDefined();
    expect(bugNode?.content).toBe("管理员更新后的缺陷记录");

    // Dev member should still not see that node at all
    const devMemberTitles = collectTitles(
      getView(crdt, userById("u-dev-member")).roots
    );
    expect(devMemberTitles).not.toContain("缺陷记录");
  });
});
