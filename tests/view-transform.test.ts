import { describe, expect, it } from "vitest";
import { canEditNode, canViewNode } from "../src/access-control/policy";
import { applyFullDocOperation } from "../src/crdt/operations";
import { getNodeSnapshot } from "../src/crdt/snapshot";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import { getView, putOperation, validateViewOperation } from "../src/view/transform";
import { AccessControlError, type User, type ViewNode } from "../src/types";

describe("privacy view transform", () => {
  it("projects different views for admin, manager, member, and guest", () => {
    const crdt = createSampleDocument();

    const adminView = getView(crdt, user("u-admin"), { now: 10 });
    const managerView = getView(crdt, user("u-dev-manager"), { now: 10 });
    const memberView = getView(crdt, user("u-dev-member"), { now: 10 });
    const guestView = getView(crdt, user("u-guest"), { now: 10 });

    expect(flattenIds(adminView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-dev-plan",
      "node-module-a",
      "node-finance"
    ]);
    expect(flattenIds(managerView.roots)).toEqual([
      "node-root",
      "node-public",
      "node-dev-plan",
      "node-module-a"
    ]);
    expect(flattenIds(memberView.roots)).toEqual(["node-root", "node-public", "node-dev-plan"]);
    expect(flattenIds(guestView.roots)).toEqual(["node-root", "node-public"]);
  });

  it("does not expose acl metadata in ordinary user views", () => {
    const crdt = createSampleDocument();
    const memberView = getView(crdt, user("u-dev-member"), { now: 10 });
    const devPlan = findViewNode(memberView.roots, "node-dev-plan");

    expect(devPlan).toBeDefined();
    expect(devPlan?.attrs).toEqual({
      department: "dev",
      tags: [],
      status: "active"
    });
    expect(JSON.stringify(devPlan)).not.toContain("allowedRoles");
    expect(JSON.stringify(devPlan)).not.toContain("editableRoles");
  });

  it("computes node visibility and edit permissions from RBAC + ABAC rules", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");
    const member = user("u-dev-member");
    const finance = getNodeSnapshot(crdt, "node-finance");
    const devPlan = getNodeSnapshot(crdt, "node-dev-plan");
    const moduleA = getNodeSnapshot(crdt, "node-module-a");

    expect(finance).toBeDefined();
    expect(devPlan).toBeDefined();
    expect(moduleA).toBeDefined();

    expect(canViewNode(member, finance!)).toBe(false);
    expect(canViewNode(member, moduleA!)).toBe(false);
    expect(canViewNode(manager, moduleA!)).toBe(true);
    expect(canEditNode(manager, devPlan!, "addNode")).toBe(true);
    expect(canEditNode(member, devPlan!, "deleteNode")).toBe(false);
  });

  it("rejects forged view operations against invisible nodes", () => {
    const crdt = createSampleDocument();
    const member = user("u-dev-member");

    expect(() =>
      validateViewOperation(crdt, member, {
        type: "renameNode",
        nodeId: "node-finance",
        title: "偷偷改财务预算"
      })
    ).toThrow(AccessControlError);
  });

  it("maps authorized view operations back to full document operations", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");

    const fullOperation = putOperation(
      crdt,
      manager,
      {
        type: "addNode",
        parentId: "node-dev-plan",
        nodeId: "node-api",
        title: "接口设计",
        content: "接口草案",
        index: 1
      },
      { now: 20 }
    );

    expect(fullOperation).toMatchObject({
      type: "addNode",
      parentId: "node-dev-plan",
      actorId: "u-dev-manager",
      timestamp: 20
    });

    if (fullOperation.type !== "addNode") {
      throw new Error("Expected addNode operation.");
    }

    expect(fullOperation.node.attrs).toEqual({
      department: "dev",
      ownerId: "u-dev-manager",
      tags: [],
      status: "active"
    });
    expect(fullOperation.node.acl.allowedUsers).toEqual(["u-dev-manager"]);

    applyFullDocOperation(crdt, fullOperation);

    const addedNode = getNodeSnapshot(crdt, "node-api");
    const parent = getNodeSnapshot(crdt, "node-dev-plan");
    expect(addedNode?.title).toBe("接口设计");
    expect(parent?.children).toEqual(["node-module-a", "node-api"]);
  });

  it("filters manager attr updates to allowed node attributes", () => {
    const crdt = createSampleDocument();
    const manager = user("u-dev-manager");

    const fullOperation = putOperation(
      crdt,
      manager,
      {
        type: "updateAttrs",
        nodeId: "node-dev-plan",
        attrsPatch: {
          status: "archived",
          department: "finance",
          tags: ["review"]
        }
      },
      { now: 30 }
    );

    expect(fullOperation).toEqual({
      type: "updateAttrs",
      nodeId: "node-dev-plan",
      attrsPatch: {
        status: "archived",
        tags: ["review"]
      },
      actorId: "u-dev-manager",
      timestamp: 30
    });
  });
});

function user(id: string): User {
  const found = sampleUsers.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Unknown sample user: ${id}`);
  }
  return found;
}

function flattenIds(nodes: ViewNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...flattenIds(node.children)]);
}

function findViewNode(nodes: ViewNode[], nodeId: string): ViewNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }
    const child = findViewNode(node.children, nodeId);
    if (child) {
      return child;
    }
  }
  return undefined;
}
