import policyConfig from "../../config/policies.json" with { type: "json" };
import { PolicyEngine } from "./policy-engine";
import type { PrivacyPolicyConfig } from "./policy-types";

export const defaultPolicyConfig = policyConfig as PrivacyPolicyConfig;
export const defaultPolicyEngine = new PolicyEngine(defaultPolicyConfig);
