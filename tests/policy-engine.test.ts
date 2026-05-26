import { describe, expect, it } from "vitest";
import { evaluateExpression } from "../src/access-control/expression";
import { PolicyEngine } from "../src/access-control/policy-engine";
import { defaultPolicyConfig } from "../src/access-control/default-policy";
import { getNodeSnapshot } from "../src/crdt/snapshot";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import type { PrivacyPolicyConfig } from "../src/access-control/policy-types";

describe("configurable BX-style policy engine", () => {
  it("evaluates controlled policy expressions without eval", () => {
    const crdt = createSampleDocument();
    const node = getNodeSnapshot(crdt, "node-dev-plan");
    const user = sampleUsers.find((candidate) => candidate.id === "u-dev-member");

    expect(node).toBeDefined();
    expect(user).toBeDefined();

    expect(
      evaluateExpression(
        "node.attrs.department == user.department and node.attrs.status == 'active'",
        { node: node!, user: user! }
      )
    ).toBe(true);

    expect(
      evaluateExpression("field in ['attrs.department', 'attrs.status']", {
        node: node!,
        user: user!,
        field: "attrs.status"
      })
    ).toBe(true);
  });

  it("uses policy config as the source of get visibility rules", () => {
    const crdt = createSampleDocument();
    const finance = getNodeSnapshot(crdt, "node-finance");
    const member = sampleUsers.find((candidate) => candidate.id === "u-dev-member");

    expect(finance).toBeDefined();
    expect(member).toBeDefined();

    const baseEngine = new PolicyEngine(defaultPolicyConfig);
    expect(baseEngine.canViewNode(member!, finance!)).toBe(false);

    const relaxedConfig: PrivacyPolicyConfig = structuredClone(defaultPolicyConfig);
    relaxedConfig.view.nodeRules.push({
      name: "temporary members can see finance",
      match: "user.role == 'member' and node.id == 'node-finance'",
      visible: true
    });
    const relaxedEngine = new PolicyEngine(relaxedConfig);

    expect(relaxedEngine.canViewNode(member!, finance!)).toBe(true);
  });

  it("uses policy config as the source of put attr constraints", () => {
    const crdt = createSampleDocument();
    const devPlan = getNodeSnapshot(crdt, "node-dev-plan");
    const manager = sampleUsers.find((candidate) => candidate.id === "u-dev-manager");

    expect(devPlan).toBeDefined();
    expect(manager).toBeDefined();

    const baseEngine = new PolicyEngine(defaultPolicyConfig);
    expect(
      baseEngine.sanitizeAttrsPatch(manager!, devPlan!, {
        department: "finance",
        status: "archived",
        tags: ["review"]
      })
    ).toEqual({ status: "archived", tags: ["review"] });

    const relaxedConfig: PrivacyPolicyConfig = structuredClone(defaultPolicyConfig);
    const managerAttrRule = relaxedConfig.put.attrRules.find((rule) => rule.name.includes("manager"));
    if (!managerAttrRule) {
      throw new Error("Expected manager attr rule.");
    }
    managerAttrRule.attrs.push("department");

    const relaxedEngine = new PolicyEngine(relaxedConfig);
    expect(
      relaxedEngine.sanitizeAttrsPatch(manager!, devPlan!, {
        department: "finance",
        status: "archived"
      })
    ).toEqual({ department: "finance", status: "archived" });
  });
});
