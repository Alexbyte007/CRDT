import { applyFullDocOperation } from "../crdt/operations";
import { nodeIsDeleted } from "../crdt/conflicts";
import { getNodeSnapshot } from "../crdt/snapshot";
import { encodeStateVector } from "../crdt/state-vector";
import { getView, putOperation } from "../view/transform";
import { analyzeDeleteImpact, canResolveDeleteConflict } from "./delete-impact";
import {
  AccessControlError,
  type FullDocOperation,
  type ResurrectNodeOperation,
  type User,
  type UserView,
  type ViewOperation,
  type ViewOperationEnvelope
} from "../types";
import type {
  BatchViewOperationEnvelope,
  BatchOperationStatusResult,
  CollaborationContext,
  RejectedOperationResult,
  UndoEntry
} from "./types";

export interface ApplyViewOperationInput {
  user: User;
  operation?: ViewOperation;
  envelope?: ViewOperationEnvelope;
  undoScopeId?: string;
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
  undoScopeId?: string;
}

export interface ApplyBatchViewOperationsResult {
  applied: string[];
  skipped: string[];
  rejected: RejectedOperationResult[];
  results: BatchOperationStatusResult[];
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

  // Track for undo BEFORE applying (so capturedState reflects pre-operation state)
  context.undoManager.track(input.user.id, fullOperation, context, input.undoScopeId ?? input.user.id);

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

  if (operation.type === "addNode" && operation.parentId === null) {
    if (user.role !== "admin") {
      throw new AccessControlError(
        `Offline operation rejected: ${user.id} is not allowed to add root nodes.`
      );
    }
    return;
  }

  if (targetId === null) {
    throw new AccessControlError("Offline operation rejected: operation target is missing.");
  }

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

  if (operation.type === "deleteNode") {
    const impact = analyzeDeleteImpact(context, user, operation.nodeId);
    if (impact.blocksSilentDelete) {
      const nodeList = impact.visibleNodes
        .map((node) => `${node.title} (${node.id})`)
        .join(", ");
      if (impact.canResolveConflict && operation.confirmedImpact === true) {
        return;
      }
      throw new AccessControlError(
        impact.canResolveConflict
          ? `Delete rejected: some descendant nodes are not deletable by this user. Confirm the impact before cascading deletion: ${nodeList}.`
          : `Delete rejected: some descendant nodes are not deletable by this user. Contact an administrator or handle these child projects first: ${nodeList}.`
      );
    }
  }

  if (
    operation.type === "deleteNodeKeepChildren" &&
    target.children.length > 0 &&
    !canResolveDeleteConflict(user, target)
  ) {
    throw new AccessControlError(
      "Delete rejected: advanced delete-conflict permission is required to delete a parent while preserving child nodes."
    );
  }

  if (operation.type === "updateAcl" && operation.aclPatch.advancedPermissions) {
    validateAdvancedPermissionUsers(context, operation.aclPatch.advancedPermissions);
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
  const results: BatchOperationStatusResult[] = [];

  for (const operation of input.operations) {
    const operationSummary = summarizeBatchOperation(context, operation);
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
        envelope,
        undoScopeId: input.undoScopeId
      });

      if (result.deduplicated) {
        skipped.push(envelope.id);
        results.push({
          ...operationSummary,
          id: envelope.id,
          status: "skipped",
          reason: "重复提交，服务端已跳过"
        });
      } else {
        applied.push(envelope.id);
        results.push({
          ...operationSummary,
          id: envelope.id,
          status: "applied"
        });
      }
    } catch (error) {
      const normalized = normalizeError(error);
      rejected.push({
        id: operation.id,
        ...operationSummary,
        error: normalized
      });
      results.push({
        ...operationSummary,
        id: operation.id,
        status: "rejected",
        reason: normalized.message,
        error: normalized
      });
    }
  }

  return {
    applied,
    skipped,
    rejected,
    results,
    view: getView(context.crdt, input.user, {
      now: context.now(),
      policyEngine: context.policyEngine
    }),
    stateVector: encodeStateVector(context.crdt)
  };
}

function summarizeBatchOperation(
  context: CollaborationContext,
  envelope: Partial<BatchViewOperationEnvelope> | undefined
): Omit<BatchOperationStatusResult, "status" | "reason" | "error"> {
  const operation = envelope?.operation;
  if (!operation) {
    return { id: envelope?.id };
  }

  const nodeId = operation.type === "addNode" ? operation.parentId ?? undefined : operation.nodeId;
  const existing = nodeId ? getNodeSnapshot(context.crdt, nodeId) : undefined;
  const nodeTitle =
    operation.type === "addNode"
      ? operation.title
      : existing?.title ?? nodeId;

  return {
    id: envelope?.id,
    operationType: operation.type,
    nodeId,
    nodeTitle
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

function validateAdvancedPermissionUsers(
  context: CollaborationContext,
  advancedPermissions: { deleteConflictResolverUserIds?: string[] }
): void {
  for (const userId of advancedPermissions.deleteConflictResolverUserIds ?? []) {
    if (!context.users.has(userId)) {
      throw new AccessControlError(`Unknown advanced permission user: ${userId}`);
    }
  }
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

// ── Undo/Redo ──

export interface ApplyUndoRedoResult {
  view: UserView;
  stateVector: string;
  entryId: string;
  operationType: string;
  originalOpType: string;
  nodeId?: string;
}

export function applyUndoRequest(
  context: CollaborationContext,
  user: User,
  undoScopeId: string = user.id
): ApplyUndoRedoResult {
  let lastError: unknown;

  while (context.undoManager.canUndo(undoScopeId)) {
    const entry = context.undoManager.peekUndo(undoScopeId);
    if (!entry) break;

    try {
      preflightUndoOperation(context, user, entry);
      context.undoManager.popUndo(undoScopeId);
      applyFullDocOperation(context.crdt, entry.inverseOp);

      return {
        view: getView(context.crdt, user, {
          now: context.now(),
          policyEngine: context.policyEngine
        }),
        stateVector: encodeStateVector(context.crdt),
        entryId: entry.id,
        operationType: entry.inverseOp.type,
        originalOpType: entry.originalOp.type,
        nodeId: extractNodeId(entry.originalOp)
      };
    } catch (error) {
      lastError = error;
      context.undoManager.discardUndo(undoScopeId);
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Nothing more to undo. Last skipped entry: ${lastError.message}`
      : "Nothing to undo."
  );
}

export function applyRedoRequest(
  context: CollaborationContext,
  user: User,
  undoScopeId: string = user.id
): ApplyUndoRedoResult {
  let lastError: unknown;

  while (context.undoManager.canRedo(undoScopeId)) {
    const entry = context.undoManager.peekRedo(undoScopeId);
    if (!entry) break;

    try {
      preflightRedoOperation(context, user, entry);
      context.undoManager.popRedo(undoScopeId);
      const redoOperation = buildRedoOperation(context, entry);
      applyFullDocOperation(context.crdt, redoOperation);

      return {
        view: getView(context.crdt, user, {
          now: context.now(),
          policyEngine: context.policyEngine
        }),
        stateVector: encodeStateVector(context.crdt),
        entryId: entry.id,
        operationType: redoOperation.type,
        originalOpType: entry.originalOp.type,
        nodeId: extractNodeId(entry.originalOp)
      };
    } catch (error) {
      lastError = error;
      context.undoManager.discardRedo(undoScopeId);
    }
  }

  throw new Error(
    lastError instanceof Error
      ? `Nothing more to redo. Last skipped entry: ${lastError.message}`
      : "Nothing to redo."
  );
}

function buildRedoOperation(context: CollaborationContext, entry: UndoEntry): FullDocOperation {
  if (entry.capturedState.kind === "addNode" && entry.originalOp.type === "addNode") {
    return {
      type: "resurrectNode",
      nodeId: entry.capturedState.nodeId,
      subtreeNodes: [entry.capturedState.nodeSnapshot],
      actorId: entry.originalOp.actorId,
      timestamp: context.now()
    } satisfies ResurrectNodeOperation;
  }

  return entry.originalOp;
}

function extractNodeId(operation: FullDocOperation): string | undefined {
  if ("nodeId" in operation && typeof (operation as { nodeId?: unknown }).nodeId === "string") {
    return (operation as { nodeId: string }).nodeId;
  }
  if (operation.type === "addNode" && "node" in operation) {
    return (operation as { node: { id: string } }).node.id;
  }
  return undefined;
}

function preflightUndoOperation(
  context: CollaborationContext,
  user: User,
  undoEntry: UndoEntry
): void {
  // Only the original actor can undo their own operations
  if (user.id !== undoEntry.actorId) {
    throw new AccessControlError(
      "Only the original actor can undo their own operations."
    );
  }

  const captured = undoEntry.capturedState;
  const inverseOp = undoEntry.inverseOp;

  switch (inverseOp.type) {
    case "deleteNode": {
      // Undo of addNode → delete the created node
      // Check: user can still view and delete the target node
      const target = getNodeSnapshot(context.crdt, inverseOp.nodeId);
      if (!target) {
        // Node already deleted (possibly cascaded by parent deletion) — skip
        throw new AccessControlError(
          `Cannot undo: node ${inverseOp.nodeId} no longer exists.`
        );
      }
      if (!context.policyEngine.canViewNode(user, target)) {
        throw new AccessControlError(
          `Cannot undo: target node is no longer visible to you.`
        );
      }
      if (!context.policyEngine.canEditNode(user, target, "deleteNode")) {
        throw new AccessControlError(
          `Cannot undo: you no longer have permission to delete this node.`
        );
      }
      return;
    }

    case "resurrectNode":
    case "resurrectNodeKeepChildren": {
      // Undo of deleteNode → resurrect from tombstone
      // Check: parent node (if any) still exists and is visible
      let parentId: string | null = null;
      if (captured.kind === "deleteNode") {
        parentId = captured.previousParentId;
      } else if (captured.kind === "deleteNodeKeepChildren") {
        parentId = captured.previousParentId;
      }

      if (parentId !== null) {
        const parent = getNodeSnapshot(context.crdt, parentId);
        if (!parent) {
          throw new AccessControlError(
            `Cannot undo delete: parent node ${parentId} no longer exists.`
          );
        }
        if (!context.policyEngine.canViewNode(user, parent)) {
          throw new AccessControlError(
            `Cannot undo delete: parent node is no longer visible to you.`
          );
        }
      }

      // Verify the tombstone still exists
      if (!context.crdt.tombstones.has(captured.kind === "deleteNode" ? captured.nodeId : captured.nodeId)) {
        throw new AccessControlError(
          `Cannot undo delete: the deleted node is no longer in tombstone storage.`
        );
      }
      return;
    }

    case "renameNode":
    case "updateContent":
    case "updateAttrs":
    case "updateAcl": {
      // Undo of a mutation operation
      // Check: target node still exists and is visible
      const target = getNodeSnapshot(context.crdt, inverseOp.nodeId);
      if (!target) {
        throw new AccessControlError(
          `Cannot undo: target node no longer exists.`
        );
      }
      if (!context.policyEngine.canViewNode(user, target)) {
        throw new AccessControlError(
          `Cannot undo: target node is no longer visible to you.`
        );
      }
      // Allow undo even if edit permission changed — user is reverting own action
      return;
    }

    default:
      throw new AccessControlError(
        `Unsupported undo operation type: ${(inverseOp as { type: string }).type}`
      );
  }
}

function preflightRedoOperation(
  context: CollaborationContext,
  user: User,
  redoEntry: UndoEntry
): void {
  // Only the original actor can redo
  if (user.id !== redoEntry.actorId) {
    throw new AccessControlError(
      "Only the original actor can redo their own operations."
    );
  }

  const originalOp = redoEntry.originalOp;

  // Re-validate using the standard preflight for the original operation type
  switch (originalOp.type) {
    case "addNode": {
      const captured = redoEntry.capturedState;
      if (captured.kind !== "addNode") {
        throw new AccessControlError("Cannot redo: add-node history is malformed.");
      }

      if (!context.crdt.tombstones.has(captured.nodeId)) {
        throw new AccessControlError(
          `Cannot redo: node ${captured.nodeId} is not available for restoration.`
        );
      }

      const parentId = captured.parentId;
      if (parentId === null) {
        return;
      }

      const parent = getNodeSnapshot(context.crdt, parentId);
      if (!parent) {
        throw new AccessControlError(
          `Cannot redo: parent node no longer exists.`
        );
      }
      if (!context.policyEngine.canViewNode(user, parent)) {
        throw new AccessControlError(
          `Cannot redo: parent node is no longer visible.`
        );
      }
      if (!context.policyEngine.canEditNode(user, parent, "addNode")) {
        throw new AccessControlError(
          `Cannot redo: no longer have permission to add children.`
        );
      }
      return;
    }

    case "deleteNode": {
      const target = getNodeSnapshot(context.crdt, originalOp.nodeId);
      if (!target) {
        throw new AccessControlError(
          `Cannot redo: target node no longer exists.`
        );
      }
      if (!context.policyEngine.canViewNode(user, target)) {
        throw new AccessControlError(
          `Cannot redo: target node is no longer visible.`
        );
      }
      if (!context.policyEngine.canEditNode(user, target, "deleteNode")) {
        throw new AccessControlError(
          `Cannot redo: no longer have permission to delete.`
        );
      }
      return;
    }

    case "deleteNodeKeepChildren":
    case "renameNode":
    case "updateContent":
    case "updateAttrs":
    case "updateAcl": {
      const target = getNodeSnapshot(context.crdt, originalOp.nodeId);
      if (!target) {
        throw new AccessControlError(
          `Cannot redo: target node no longer exists.`
        );
      }
      if (!context.policyEngine.canViewNode(user, target)) {
        throw new AccessControlError(
          `Cannot redo: target node is no longer visible.`
        );
      }
      return;
    }

    default:
      throw new AccessControlError(
        `Unsupported redo operation type: ${(originalOp as { type: string }).type}`
      );
  }
}
