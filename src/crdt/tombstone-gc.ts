import type { NodeId } from "../types";
import type { CrdtDocument } from "./document";
import { touchDocument, yNodeToSnapshot } from "./document";

export const DEFAULT_TOMBSTONE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export interface CompactTombstonesOptions {
  now?: number;
  retentionMs?: number;
  protectedNodeIds?: Iterable<NodeId>;
}

export interface CompactTombstonesResult {
  removed: NodeId[];
  retained: number;
}

export function compactTombstones(
  crdt: CrdtDocument,
  options: CompactTombstonesOptions = {}
): CompactTombstonesResult {
  const now = options.now ?? Date.now();
  const retentionMs = options.retentionMs ?? DEFAULT_TOMBSTONE_RETENTION_MS;
  const protectedNodeIds = new Set(options.protectedNodeIds ?? []);
  const removed: NodeId[] = [];

  crdt.doc.transact(() => {
    for (const [nodeId, tombstone] of crdt.tombstones.entries()) {
      if (protectedNodeIds.has(nodeId)) {
        continue;
      }

      const snapshot = yNodeToSnapshot(tombstone);
      if (now - snapshot.updatedAt < retentionMs) {
        continue;
      }

      crdt.tombstones.delete(nodeId);
      removed.push(nodeId);
    }

    if (removed.length > 0) {
      touchDocument(crdt, now);
    }
  });

  return {
    removed,
    retained: crdt.tombstones.size
  };
}
