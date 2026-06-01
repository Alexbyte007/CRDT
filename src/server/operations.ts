import { applyFullDocOperation } from "../crdt/operations";
import { nodeIsDeleted } from "../crdt/conflicts";
import { getNodeSnapshot } from "../crdt/snapshot";
import { encodeStateVector } from "../crdt/state-vector";
import { getView, putOperation } from "../view/transform";
import { analyzeDeleteImpact } from "./delete-impact";
import { AccessControlError, type User, type UserView, type ViewOperation, type ViewOperationEnvelope } from "../types";
import type {
  BatchViewOperationEnvelope,
  CollaborationContext,
  RejectedOperationResult
} from "./types";

export interface ApplyViewOperationInput {
  user: User;
  operation?: ViewOperation;
  envelope?: ViewOperationEnvelope;
}

export interface ApplyViewOperationResult {
  view: UserView;
  operationId?: string;
  deduplicated: boolean;
  stateVector: string;
}

export interface ApplyBatchViewOperationsInput {
  user: User;
  operations?: BatchViewOperationEnvelope[];
}

export interface ApplyBatchViewOperationsResult {
  applied: string[];
  skipped: string[];
  rejected: RejectedOperationResult[];
  view: UserView;
  stateVector: string;
}

export function applyViewOperationRequest(
  context: CollaborationContext,
  input: ApplyViewOperationInput
): ApplyViewOperationResult {
  const operation = normalizeOperation(input);
  const operationId = input.envelope?.id;

  if (operationId && context.processedOperationIds.has(operationId)) {
    return {
      view: getView(context.crdt, input.user, {
        now: context.now(),
        policyEngine: context.policyEngine
      }),
      operationId,
      deduplicated: true,
      stateVector: encodeStateVector(context.crdt)
    };
  }

  preflightViewOperation(context, input.user, operation);
  const fullOperation = putOperation(context.crdt, input.user, operation, {
    now: context.now(),
    policyEngine: context.policyEngine
  });
  applyFullDocOperation(context.crdt, fullOperation);

  if (operationId) {
    context.processedOperationIds.add(operationId);
  }

  return {
    view: getView(context.crdt, input.user, {
      now: context.now(),
      policyEngine: context.policyEngine
    }),
    operationId,
    deduplicated: false,
    stateVector: encodeStateVector(context.crdt)
  };
}

function preflightViewOperation(
  context: CollaborationContext,
  user: User,
  operation: ViewOperation
): void {
  const targetId = operation.type === "addNode" ? operation.parentId : operation.nodeId;
  const targetKind = operation.type === "addNode" ? "parent" : "target";

  if (nodeIsDeleted(context.crdt, targetId)) {
    throw new AccessControlError(
      `Offline operation rejected: ${targetKind} node ${targetId} was deleted before reconnect.`
    );
  }

  const target = getNodeSnapshot(context.crdt, targetId);
  if (!target) {
    throw new AccessControlError(
      `Offline operation rejected: ${targetKind} node ${targetId} no longer exists.`
    );
  }

  if (!context.policyEngine.canViewNode(user, target)) {
    throw new AccessControlError(
      `Offline operation rejected: ${targetKind} node ${targetId} is no longer visible to ${user.id}.`
    );
  }

  if (!context.policyEngine.canEditNode(user, target, operation.type)) {
    const action =
      operation.type === "addNode"
        ? "add a child under"
        : operation.type === "deleteNodeKeepChildren"
          ? "delete a node while preserving its children on"
          : `${operation.type} on`;
    throw new AccessControlError(
      `Offline operation rejected: ${user.id} is no longer allowed to ${action} node ${targetId}.`
    );
  }

  if (operation.type === "deleteNode" && user.role !== "admin") {
    const impact = analyzeDeleteImpact(context, user, operation.nodeId);
    if (impact.blocksSilentDelete) {
      const nodeList = impact.visibleNodes
        .map((node) => `${node.title} (${node.id})`)
        .join(", ");
      throw new AccessControlError(
        `Delete rejected: descendant nodes are visible to broader audiences. Contact an administrator or handle these child projects first: ${nodeList}.`
      );
    }
  }

  if (operation.type === "deleteNodeKeepChildren" && user.role !== "admin") {
    throw new AccessControlError(
      "Delete rejected: only administrators can delete a parent while preserving child nodes."
    );
  }
}

export function applyBatchViewOperationRequest(
  context: CollaborationContext,
  input: ApplyBatchViewOperationsInput
): ApplyBatchViewOperationsResult {
  if (!Array.isArray(input.operations)) {
    throw new Error("Batch request must include operations array.");
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  const rejected: RejectedOperationResult[] = [];

  for (const operation of input.operations) {
    try {
      if (!operation.id) {
        throw new Error("Batch operation id is required.");
      }

      const envelope: ViewOperationEnvelope = {
        ...operation,
        userId: operation.userId ?? input.user.id
      };
      const result = applyViewOperationRequest(context, {
        user: input.user,
        envelope
      });

      if (result.deduplicated) {
        skipped.push(envelope.id);
      } else {
        applied.push(envelope.id);
      }
    } catch (error) {
      rejected.push({
        id: operation.id,
        error: normalizeError(error)
      });
    }
  }

  return {
    applied,
    skipped,
    rejected,
    view: getView(context.crdt, input.user, {
      now: context.now(),
      policyEngine: context.policyEngine
    }),
    stateVector: encodeStateVector(context.crdt)
  };
}

function normalizeOperation(input: ApplyViewOperationInput): ViewOperation {
  if (input.envelope) {
    if (input.envelope.userId !== input.user.id) {
      throw new Error(
        `Envelope userId ${input.envelope.userId} does not match request user ${input.user.id}.`
      );
    }

    if (!input.envelope.baseStateVector) {
      throw new Error("Envelope baseStateVector is required.");
    }

    return input.envelope.operation;
  }

  if (input.operation) {
    return input.operation;
  }

  throw new Error("Request must include either operation or envelope.");
}

function normalizeError(error: unknown): { name: string; code?: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      code: classifyErrorCode(error),
      message: error.message
    };
  }

  return {
    name: "Error",
    message: String(error)
  };
}

function classifyErrorCode(error: Error): string {
  if (error.name === "AccessControlError") {
    if (/deleted before reconnect/.test(error.message)) {
      return "TARGET_DELETED";
    }
    if (/no longer exists|does not exist/.test(error.message)) {
      return "TARGET_NOT_FOUND";
    }
    if (/no longer visible/.test(error.message)) {
      return "TARGET_NOT_VISIBLE";
    }
    if (/not allowed|no longer allowed|No attrs/.test(error.message)) {
      return "ACCESS_DENIED";
    }
    return "ACCESS_CONTROL_REJECTED";
  }

  if (/baseStateVector/.test(error.message) || /userId/.test(error.message)) {
    return "INVALID_ENVELOPE";
  }

  return "UNKNOWN_ERROR";
}
