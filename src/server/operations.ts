import { applyFullDocOperation } from "../crdt/operations";
import { encodeStateVector } from "../crdt/state-vector";
import { getView, putOperation } from "../view/transform";
import type { User, UserView, ViewOperation, ViewOperationEnvelope } from "../types";
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

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    name: "Error",
    message: String(error)
  };
}
