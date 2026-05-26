import type { NodeId, TreeNodeSnapshot } from "../types";
import {
  createYNode,
  type CrdtDocument,
  getChildrenArray,
  getNodeMap,
  touchDocument,
  yNodeToSnapshot
} from "./document";

export interface ConflictReconcileOptions {
  now?: number;
}

export interface ConflictReconcileResult {
  tombstoned: NodeId[];
  prunedReferences: NodeId[];
}

export function reconcileDocumentConflicts(
  crdt: CrdtDocument,
  options: ConflictReconcileOptions = {}
): ConflictReconcileResult {
  const deletedIds = new Set<NodeId>(Array.from(crdt.tombstones.keys()));
  const snapshots = snapshotActiveNodes(crdt);
  const tombstoned = collectNodesDeletedByPolicy(snapshots, deletedIds);
  const prunedReferences = new Set<NodeId>();

  if (tombstoned.length === 0) {
    pruneDeletedReferences(crdt, deletedIds, prunedReferences);
    return {
      tombstoned,
      prunedReferences: Array.from(prunedReferences)
    };
  }

  const timestamp = options.now ?? Date.now();
  crdt.doc.transact(() => {
    for (const snapshot of tombstoned.map((nodeId) => snapshots.get(nodeId)).filter(isDefined)) {
      if (!crdt.tombstones.has(snapshot.id)) {
        crdt.tombstones.set(snapshot.id, createYNode(snapshot));
      }
      crdt.nodes.delete(snapshot.id);
      deletedIds.add(snapshot.id);
    }

    pruneDeletedReferences(crdt, deletedIds, prunedReferences);
    touchDocument(crdt, timestamp);
  });

  return {
    tombstoned,
    prunedReferences: Array.from(prunedReferences)
  };
}

function snapshotActiveNodes(crdt: CrdtDocument): Map<NodeId, TreeNodeSnapshot> {
  const snapshots = new Map<NodeId, TreeNodeSnapshot>();
  for (const [nodeId, node] of crdt.nodes.entries()) {
    snapshots.set(nodeId, yNodeToSnapshot(node));
  }
  return snapshots;
}

function collectNodesDeletedByPolicy(
  snapshots: Map<NodeId, TreeNodeSnapshot>,
  initialDeletedIds: Set<NodeId>
): NodeId[] {
  const deletedIds = new Set(initialDeletedIds);
  const tombstoned: NodeId[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    for (const snapshot of snapshots.values()) {
      if (deletedIds.has(snapshot.id)) {
        if (!tombstoned.includes(snapshot.id)) {
          tombstoned.push(snapshot.id);
        }
        continue;
      }

      if (snapshot.parentId !== null && deletedIds.has(snapshot.parentId)) {
        deletedIds.add(snapshot.id);
        tombstoned.push(snapshot.id);
        changed = true;
      }
    }
  }

  return tombstoned;
}

function pruneDeletedReferences(
  crdt: CrdtDocument,
  deletedIds: Set<NodeId>,
  prunedReferences: Set<NodeId>
): void {
  pruneArray(crdt.rootIds, deletedIds, prunedReferences);

  for (const node of crdt.nodes.values()) {
    pruneArray(getChildrenArray(node), deletedIds, prunedReferences);
  }
}

function pruneArray(
  array: { length: number; get(index: number): NodeId; delete(index: number, length: number): void },
  deletedIds: Set<NodeId>,
  prunedReferences: Set<NodeId>
): void {
  for (let index = array.length - 1; index >= 0; index -= 1) {
    const nodeId = array.get(index);
    if (deletedIds.has(nodeId)) {
      array.delete(index, 1);
      prunedReferences.add(nodeId);
    }
  }
}

export function nodeIsDeleted(crdt: CrdtDocument, nodeId: NodeId): boolean {
  return crdt.tombstones.has(nodeId) && !getNodeMap(crdt, nodeId);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
