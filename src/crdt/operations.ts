import {
  type AddNodeOperation,
  CrdtDocumentError,
  type DeleteNodeOperation,
  type DeleteNodeKeepChildrenOperation,
  type FullDocOperation,
  type NewTreeNode,
  type NodeId,
  type RenameNodeOperation,
  type ResurrectNodeOperation,
  type ResurrectNodeKeepChildrenOperation,
  type TreeNodeSnapshot,
  type UpdateAclOperation,
  type UpdateAttrsOperation,
  type UpdateContentOperation
} from "../types";
import type * as Y from "yjs";
import { reconcileDocumentConflicts } from "./conflicts";
import {
  createYNode,
  type CrdtDocument,
  getAclMap,
  getAttrsMap,
  getChildrenArray,
  getContentText,
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
    case "deleteNodeKeepChildren":
      deleteNodeKeepChildren(crdt, operation);
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
    case "updateAcl":
      updateAcl(crdt, operation);
      break;
    case "resurrectNode":
      resurrectNode(crdt, operation);
      break;
    case "resurrectNodeKeepChildren":
      resurrectNodeKeepChildren(crdt, operation);
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

export function deleteNodeKeepChildren(
  crdt: CrdtDocument,
  operation: DeleteNodeKeepChildrenOperation
): TreeNodeSnapshot[] {
  const timestamp = operation.timestamp ?? Date.now();
  const target = requireNode(crdt, operation.nodeId);
  const targetSnapshot = yNodeToSnapshot(target);
  const deletedSnapshots = [targetSnapshot];
  const childIds = [...targetSnapshot.children];

  crdt.doc.transact(() => {
    if (targetSnapshot.parentId === null) {
      const rootIndex = indexOfId(crdt.rootIds, operation.nodeId);
      if (rootIndex >= 0) {
        crdt.rootIds.delete(rootIndex, 1);
        if (childIds.length > 0) {
          crdt.rootIds.insert(rootIndex, childIds);
        }
      }
    } else {
      const parent = getNodeMap(crdt, targetSnapshot.parentId);
      if (parent) {
        const siblings = getChildrenArray(parent);
        const targetIndex = indexOfId(siblings, operation.nodeId);
        if (targetIndex >= 0) {
          siblings.delete(targetIndex, 1);
          if (childIds.length > 0) {
            siblings.insert(targetIndex, childIds);
          }
        }
        touchNode(parent, operation.actorId, timestamp);
      }
    }

    for (const childId of childIds) {
      const child = getNodeMap(crdt, childId);
      if (child) {
        child.set("parentId", targetSnapshot.parentId);
        touchNode(child, operation.actorId, timestamp);
      }
    }

    const tombstone = createYNode({
      ...targetSnapshot,
      children: [],
      updatedBy: operation.actorId,
      updatedAt: timestamp
    });
    crdt.tombstones.set(targetSnapshot.id, tombstone);
    crdt.nodes.delete(targetSnapshot.id);
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
    const content = getContentText(node);
    applyTextReplacement(content, operation.baseContent, operation.content);
    touchNode(node, operation.actorId, timestamp);
    touchDocument(crdt, timestamp);
  });

  return yNodeToSnapshot(node);
}

function applyTextReplacement(text: Y.Text, baseContent: string | undefined, nextContent: string): void {
  const currentContent = text.toString();
  if (baseContent === undefined) {
    if (currentContent.length > 0) {
      text.delete(0, currentContent.length);
    }
    if (nextContent.length > 0) {
      text.insert(0, nextContent);
    }
    return;
  }

  const base = baseContent ?? currentContent;
  const patch = diffReplacement(base, nextContent);
  const start = mapPatchStartToCurrent(currentContent, patch);
  const deleteLength = mapDeleteLengthToCurrent(currentContent, patch, start);
  if (deleteLength > 0) {
    text.delete(start, deleteLength);
  }
  if (patch.insertText.length > 0) {
    text.insert(start, patch.insertText);
  }
}

function diffReplacement(baseContent: string, nextContent: string): {
  start: number;
  deleteLength: number;
  insertText: string;
  prefix: string;
  removedText: string;
  suffix: string;
} {
  let start = 0;
  const baseLength = baseContent.length;
  const nextLength = nextContent.length;

  while (
    start < baseLength &&
    start < nextLength &&
    baseContent[start] === nextContent[start]
  ) {
    start += 1;
  }

  let baseEnd = baseLength;
  let nextEnd = nextLength;
  while (
    baseEnd > start &&
    nextEnd > start &&
    baseContent[baseEnd - 1] === nextContent[nextEnd - 1]
  ) {
    baseEnd -= 1;
    nextEnd -= 1;
  }

  return {
    start,
    deleteLength: baseEnd - start,
    insertText: nextContent.slice(start, nextEnd),
    prefix: baseContent.slice(0, start),
    removedText: baseContent.slice(start, baseEnd),
    suffix: baseContent.slice(baseEnd)
  };
}

function mapPatchStartToCurrent(
  currentContent: string,
  patch: ReturnType<typeof diffReplacement>
): number {
  if (patch.prefix.length > 0 && patch.suffix.length > 0) {
    const prefixIndex = currentContent.indexOf(patch.prefix);
    if (prefixIndex >= 0) {
      const afterPrefix = prefixIndex + patch.prefix.length;
      const suffixIndex = currentContent.indexOf(patch.suffix, afterPrefix);
      if (suffixIndex >= 0) {
        return afterPrefix;
      }
    }
  }

  if (patch.prefix.length > 0) {
    const prefixIndex = currentContent.lastIndexOf(patch.prefix);
    if (prefixIndex >= 0) {
      return prefixIndex + patch.prefix.length;
    }
  }

  if (patch.suffix.length > 0) {
    const suffixIndex = currentContent.indexOf(patch.suffix);
    if (suffixIndex >= 0) {
      return suffixIndex;
    }
  }

  return Math.min(patch.start, currentContent.length);
}

function mapDeleteLengthToCurrent(
  currentContent: string,
  patch: ReturnType<typeof diffReplacement>,
  start: number
): number {
  if (patch.deleteLength <= 0) {
    return 0;
  }

  if (patch.removedText.length > 0 && currentContent.slice(start, start + patch.removedText.length) === patch.removedText) {
    return patch.removedText.length;
  }

  if (patch.suffix.length > 0) {
    const suffixIndex = currentContent.indexOf(patch.suffix, start);
    if (suffixIndex >= start) {
      return suffixIndex - start;
    }
  }

  return Math.min(patch.deleteLength, Math.max(0, currentContent.length - start));
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

export function updateAcl(crdt: CrdtDocument, operation: UpdateAclOperation): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();
  const node = requireNode(crdt, operation.nodeId);

  crdt.doc.transact(() => {
    const acl = getAclMap(node);
    for (const [key, value] of Object.entries(operation.aclPatch)) {
      if (value === undefined) {
        acl.delete(key);
      } else {
        acl.set(key, value);
      }
    }
    touchNode(node, operation.actorId, timestamp);
    touchDocument(crdt, timestamp);
  });

  return yNodeToSnapshot(node);
}

export function resurrectNode(
  crdt: CrdtDocument,
  operation: ResurrectNodeOperation
): TreeNodeSnapshot[] {
  const timestamp = operation.timestamp ?? Date.now();

  if (!crdt.tombstones.has(operation.nodeId)) {
    throw new CrdtDocumentError(
      `Cannot resurrect: node ${operation.nodeId} is not in tombstones.`
    );
  }

  if (crdt.nodes.has(operation.nodeId)) {
    throw new CrdtDocumentError(
      `Cannot resurrect: node ${operation.nodeId} already exists in active nodes.`
    );
  }

  // Build a map of nodeId -> snapshot for quick lookup
  const subtreeMap = new Map<NodeId, TreeNodeSnapshot>();
  for (const snapshot of operation.subtreeNodes) {
    subtreeMap.set(snapshot.id, snapshot);
  }

  const rootSnapshot = subtreeMap.get(operation.nodeId);
  if (!rootSnapshot) {
    throw new CrdtDocumentError(
      `Cannot resurrect: root node ${operation.nodeId} not found in subtree snapshots.`
    );
  }

  const restored: TreeNodeSnapshot[] = [];

  // Verify that none of the subtree node IDs already exist in active nodes
  for (const nodeId of subtreeMap.keys()) {
    if (crdt.nodes.has(nodeId)) {
      throw new CrdtDocumentError(
        `Cannot resurrect: node ${nodeId} already exists in active nodes.`
      );
    }
  }

  crdt.doc.transact(() => {
    // Process nodes in parent-first order: start with the root, then children recursively
    const processed = new Set<NodeId>();

    function restoreNode(nodeId: NodeId): void {
      if (processed.has(nodeId)) return;
      const snapshot = subtreeMap.get(nodeId);
      if (!snapshot) return;

      processed.add(nodeId);

      // First restore children (so parent can reference them)
      for (const childId of snapshot.children) {
        restoreNode(childId);
      }

      // Remove from tombstones
      crdt.tombstones.delete(nodeId);

      // Create fresh Y.Map with updated timestamps
      const yNode = createYNode({
        ...snapshot,
        updatedBy: operation.actorId,
        updatedAt: timestamp
      });
      crdt.nodes.set(nodeId, yNode);

      restored.push(snapshot);
    }

    // Restore the root first, which triggers recursive restoration
    restoreNode(operation.nodeId);

    // Restore root's parent-child links
    if (rootSnapshot.parentId === null) {
      crdt.rootIds.push([operation.nodeId]);
    } else {
      const parent = getNodeMap(crdt, rootSnapshot.parentId);
      if (parent) {
        const children = getChildrenArray(parent);
        children.push([operation.nodeId]);
        touchNode(parent, operation.actorId, timestamp);
      } else {
        // Parent doesn't exist anymore — make it a root node
        crdt.rootIds.push([operation.nodeId]);
      }
    }

    touchDocument(crdt, timestamp);
  });

  return restored;
}

export function resurrectNodeKeepChildren(
  crdt: CrdtDocument,
  operation: ResurrectNodeKeepChildrenOperation
): TreeNodeSnapshot {
  const timestamp = operation.timestamp ?? Date.now();

  if (!crdt.tombstones.has(operation.nodeId)) {
    throw new CrdtDocumentError(
      `Cannot resurrect: node ${operation.nodeId} is not in tombstones.`
    );
  }

  if (crdt.nodes.has(operation.nodeId)) {
    throw new CrdtDocumentError(
      `Cannot resurrect: node ${operation.nodeId} already exists in active nodes.`
    );
  }

  // Verify all child IDs point to active nodes
  for (const childId of operation.childIds) {
    if (!crdt.nodes.has(childId)) {
      throw new CrdtDocumentError(
        `Cannot resurrect keep-children: child node ${childId} does not exist in active nodes.`
      );
    }
  }

  crdt.doc.transact(() => {
    // Remove from tombstones
    crdt.tombstones.delete(operation.nodeId);

    // Create fresh Y.Map with the snapshot data
    const yNode = createYNode({
      ...operation.nodeSnapshot,
      children: operation.childIds,
      parentId: operation.previousParentId,
      updatedBy: operation.actorId,
      updatedAt: timestamp
    });
    crdt.nodes.set(operation.nodeId, yNode);

    // Re-parent children back to this node
    for (const childId of operation.childIds) {
      const child = getNodeMap(crdt, childId);
      if (child) {
        // Remove child from its current parent's children array
        const currentParentId = child.get("parentId") as NodeId | null;
        if (currentParentId !== null) {
          const currentParent = getNodeMap(crdt, currentParentId);
          if (currentParent) {
            const siblings = getChildrenArray(currentParent);
            removeSingleId(siblings, childId);
          }
        } else {
          removeSingleId(crdt.rootIds, childId);
        }

        // Set child's parentId back to the resurrected node
        child.set("parentId", operation.nodeId);
        touchNode(child, operation.actorId, timestamp);
      }
    }

    // Insert the resurrected node at its previous position
    if (operation.previousParentId === null) {
      const safeIndex = clampIndex(operation.previousIndex, crdt.rootIds.length);
      crdt.rootIds.insert(safeIndex, [operation.nodeId]);
    } else {
      const parent = getNodeMap(crdt, operation.previousParentId);
      if (parent) {
        const children = getChildrenArray(parent);
        const safeIndex = clampIndex(operation.previousIndex, children.length);
        children.insert(safeIndex, [operation.nodeId]);
        touchNode(parent, operation.actorId, timestamp);
      } else {
        // Parent no longer exists — make it a root node
        crdt.rootIds.push([operation.nodeId]);
      }
    }

    touchDocument(crdt, timestamp);
  });

  return operation.nodeSnapshot;
}

export function findIndexInParent(crdt: CrdtDocument, nodeId: NodeId): number {
  const node = getNodeMap(crdt, nodeId);
  if (!node) return -1;

  const parentId = node.get("parentId") as NodeId | null;
  if (parentId === null) {
    return indexOfId(crdt.rootIds, nodeId);
  }

  const parent = getNodeMap(crdt, parentId);
  if (!parent) return -1;

  return indexOfId(getChildrenArray(parent), nodeId);
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

export function collectSubtreeSnapshots(crdt: CrdtDocument, rootId: NodeId): TreeNodeSnapshot[] {
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

function removeSingleId(array: Y.Array<NodeId>, nodeId: NodeId): void {
  for (let index = 0; index < array.length; index += 1) {
    if (array.get(index) === nodeId) {
      array.delete(index, 1);
      return;
    }
  }
}

function indexOfId(array: Y.Array<NodeId>, nodeId: NodeId): number {
  for (let index = 0; index < array.length; index += 1) {
    if (array.get(index) === nodeId) {
      return index;
    }
  }
  return -1;
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
