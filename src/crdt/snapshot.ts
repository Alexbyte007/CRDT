import type * as Y from "yjs";
import type { DocumentSnapshot, NodeId, TreeNodeSnapshot } from "../types";
import { type CrdtDocument, getMetaSnapshot, yNodeToSnapshot } from "./document";

export function getNodeSnapshot(
  crdt: CrdtDocument,
  nodeId: NodeId
): TreeNodeSnapshot | undefined {
  const node = crdt.nodes.get(nodeId);
  return node ? yNodeToSnapshot(node) : undefined;
}

export function getDocumentSnapshot(crdt: CrdtDocument): DocumentSnapshot {
  return {
    meta: getMetaSnapshot(crdt),
    rootIds: crdt.rootIds.toArray(),
    nodes: snapshotNodeMap(crdt.nodes),
    tombstones: snapshotNodeMap(crdt.tombstones)
  };
}

function snapshotNodeMap(
  nodes: Iterable<[NodeId, Y.Map<unknown>]>
): Record<NodeId, TreeNodeSnapshot> {
  const result: Record<NodeId, TreeNodeSnapshot> = {};
  for (const [nodeId, node] of nodes) {
    result[nodeId] = yNodeToSnapshot(node);
  }
  return result;
}
