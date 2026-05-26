import {
  type AddNodeOperation,
  CrdtDocumentError,
  type DeleteNodeOperation,
  type FullDocOperation,
  type NewTreeNode,
  type NodeId,
  type RenameNodeOperation,
  type TreeNodeSnapshot,
  type UpdateAttrsOperation,
  type UpdateContentOperation
} from "../types";
import type * as Y from "yjs";
import { reconcileDocumentConflicts } from "./conflicts";
import {
  createYNode,
  type CrdtDocument,
  getAttrsMap,
  getChildrenArray,
  getNodeMap,
  touchDocument,
  touchNode,
  yNodeToSnapshot
} from "./document";

export function applyFullDocOperation(crdt: CrdtDocument, operation: FullDocOperation): void {
  switch (operation.type) {
    case "addNode":
      addNode(crdt, operation);
      break;
    case "deleteNode":
      deleteNode(crdt, operation);
      break;
    case "renameNode":
      renameNode(crdt, operation);
      break;
    case "updateContent":
      updateContent(crdt, operation);
      break;
    case "updateAttrs":
      updateAttrs(crdt, operation);
      break;
    default:
      assertNever(operation);
  }

  reconcileDocumentConflicts(crdt, { now: operation.timestamp });
}

export function addNode(crdt: CrdtDocument, operation: AddNodeOperation): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();

  if (crdt.nodes.has(operation.node.id)) {
    throw new CrdtDocumentError(`Node already exists: ${operation.node.id}`);
  }

  if (crdt.tombstones.has(operation.node.id)) {
    throw new CrdtDocumentError(`Deleted node id cannot be reused: ${operation.node.id}`);
  }

  if (operation.parentId !== null && !crdt.nodes.has(operation.parentId)) {
    throw new CrdtDocumentError(`Parent node does not exist: ${operation.parentId}`);
  }

  const snapshot = createNodeSnapshot(operation.node, operation.parentId, operation.actorId, timestamp);

  crdt.doc.transact(() => {
    crdt.nodes.set(snapshot.id, createYNode(snapshot));

    if (snapshot.parentId === null) {
      insertId(crdt.rootIds, snapshot.id, operation.index);
    } else {
      const parent = requireNode(crdt, snapshot.parentId);
      insertId(getChildrenArray(parent), snapshot.id, operation.index);
      touchNode(parent, operation.actorId, timestamp);
    }

    touchDocument(crdt, timestamp);
  });

  return snapshot;
}

export function deleteNode(crdt: CrdtDocument, operation: DeleteNodeOperation): TreeNodeSnapshot[] {
  const timestamp = operation.timestamp ?? Date.now();
  const target = requireNode(crdt, operation.nodeId);
  const targetSnapshot = yNodeToSnapshot(target);
  const deletedSnapshots = collectSubtreeSnapshots(crdt, operation.nodeId);

  crdt.doc.transact(() => {
    if (targetSnapshot.parentId === null) {
      removeId(crdt.rootIds, operation.nodeId);
    } else {
      const parent = getNodeMap(crdt, targetSnapshot.parentId);
      if (parent) {
        removeId(getChildrenArray(parent), operation.nodeId);
        touchNode(parent, operation.actorId, timestamp);
      }
    }

    for (const snapshot of deletedSnapshots) {
      const tombstone = createYNode({
        ...snapshot,
        updatedBy: operation.actorId,
        updatedAt: timestamp
      });
      crdt.tombstones.set(snapshot.id, tombstone);
      crdt.nodes.delete(snapshot.id);
    }

    touchDocument(crdt, timestamp);
  });

  return deletedSnapshots;
}

export function renameNode(crdt: CrdtDocument, operation: RenameNodeOperation): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();
  const node = requireNode(crdt, operation.nodeId);

  crdt.doc.transact(() => {
    node.set("title", operation.title);
    touchNode(node, operation.actorId, timestamp);
    touchDocument(crdt, timestamp);
  });

  return yNodeToSnapshot(node);
}

export function updateContent(
  crdt: CrdtDocument,
  operation: UpdateContentOperation
): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();
  const node = requireNode(crdt, operation.nodeId);

  crdt.doc.transact(() => {
    node.set("content", operation.content);
    touchNode(node, operation.actorId, timestamp);
    touchDocument(crdt, timestamp);
  });

  return yNodeToSnapshot(node);
}

export function updateAttrs(crdt: CrdtDocument, operation: UpdateAttrsOperation): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();
  const node = requireNode(crdt, operation.nodeId);

  crdt.doc.transact(() => {
    const attrs = getAttrsMap(node);
    for (const [key, value] of Object.entries(operation.attrsPatch)) {
      if (value === undefined) {
        attrs.delete(key);
      } else {
        attrs.set(key, value);
      }
    }
    touchNode(node, operation.actorId, timestamp);
    touchDocument(crdt, timestamp);
  });

  return yNodeToSnapshot(node);
}

function createNodeSnapshot(
  node: NewTreeNode,
  parentId: NodeId | null,
  actorId: string,
  timestamp: number
): TreeNodeSnapshot {
  return {
    id: node.id,
    parentId,
    type: node.type,
    title: node.title,
    content: node.content,
    attrs: node.attrs,
    acl: node.acl,
    children: node.children ?? [],
    createdBy: node.createdBy,
    createdAt: node.createdAt ?? timestamp,
    updatedBy: node.updatedBy ?? actorId,
    updatedAt: node.updatedAt ?? timestamp
  };
}

function requireNode(crdt: CrdtDocument, nodeId: NodeId) {
  const node = getNodeMap(crdt, nodeId);
  if (!node) {
    throw new CrdtDocumentError(`Node does not exist: ${nodeId}`);
  }
  return node;
}

function collectSubtreeSnapshots(crdt: CrdtDocument, rootId: NodeId): TreeNodeSnapshot[] {
  const root = requireNode(crdt, rootId);
  const rootSnapshot = yNodeToSnapshot(root);
  const snapshots = [rootSnapshot];

  for (const childId of rootSnapshot.children) {
    if (crdt.nodes.has(childId)) {
      snapshots.push(...collectSubtreeSnapshots(crdt, childId));
    }
  }

  return snapshots;
}

function insertId(array: Y.Array<NodeId>, nodeId: NodeId, index?: number): void {
  const safeIndex = clampIndex(index ?? array.length, array.length);
  array.insert(safeIndex, [nodeId]);
}

function removeId(array: Y.Array<NodeId>, nodeId: NodeId): void {
  for (let index = array.length - 1; index >= 0; index -= 1) {
    if (array.get(index) === nodeId) {
      array.delete(index, 1);
    }
  }
}

function clampIndex(index: number, length: number): number {
  if (index < 0) {
    return 0;
  }
  if (index > length) {
    return length;
  }
  return index;
}

function assertNever(value: never): never {
  throw new CrdtDocumentError(`Unsupported operation: ${JSON.stringify(value)}`);
}
