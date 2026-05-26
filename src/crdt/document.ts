import * as Y from "yjs";
import type {
  DocumentMeta,
  NodeAcl,
  NodeAttrs,
  NodeId,
  TreeNodeSnapshot
} from "../types";

export interface CrdtDocument {
  doc: Y.Doc;
  meta: Y.Map<unknown>;
  nodes: Y.Map<Y.Map<unknown>>;
  rootIds: Y.Array<NodeId>;
  tombstones: Y.Map<Y.Map<unknown>>;
}

export interface CreateDocumentOptions {
  docId: string;
  title: string;
  now?: number;
}

export function createCrdtDocument(options: CreateDocumentOptions): CrdtDocument {
  const doc = new Y.Doc();
  const meta = doc.getMap("meta");
  const nodes = doc.getMap<Y.Map<unknown>>("nodes");
  const rootIds = doc.getArray<NodeId>("rootIds");
  const tombstones = doc.getMap<Y.Map<unknown>>("tombstones");
  const now = options.now ?? Date.now();

  doc.transact(() => {
    meta.set("docId", options.docId);
    meta.set("title", options.title);
    meta.set("schemaVersion", 1);
    meta.set("createdAt", now);
    meta.set("updatedAt", now);
  });

  return { doc, meta, nodes, rootIds, tombstones };
}

export function fromYDoc(doc: Y.Doc): CrdtDocument {
  return {
    doc,
    meta: doc.getMap("meta"),
    nodes: doc.getMap<Y.Map<unknown>>("nodes"),
    rootIds: doc.getArray<NodeId>("rootIds"),
    tombstones: doc.getMap<Y.Map<unknown>>("tombstones")
  };
}

export function createYNode(snapshot: TreeNodeSnapshot): Y.Map<unknown> {
  const node = new Y.Map<unknown>();
  node.set("id", snapshot.id);
  node.set("parentId", snapshot.parentId);
  node.set("type", snapshot.type);
  node.set("title", snapshot.title);
  node.set("content", snapshot.content);
  node.set("attrs", mapFromRecord(snapshot.attrs));
  node.set("acl", mapFromRecord(snapshot.acl));
  node.set("children", arrayFromValues(snapshot.children));
  node.set("createdBy", snapshot.createdBy);
  node.set("createdAt", snapshot.createdAt);
  node.set("updatedBy", snapshot.updatedBy);
  node.set("updatedAt", snapshot.updatedAt);
  return node;
}

export function getMetaSnapshot(crdt: CrdtDocument): DocumentMeta {
  return {
    docId: requireString(crdt.meta.get("docId"), "meta.docId"),
    title: requireString(crdt.meta.get("title"), "meta.title"),
    schemaVersion: requireNumber(crdt.meta.get("schemaVersion"), "meta.schemaVersion"),
    createdAt: requireNumber(crdt.meta.get("createdAt"), "meta.createdAt"),
    updatedAt: requireNumber(crdt.meta.get("updatedAt"), "meta.updatedAt")
  };
}

export function getNodeMap(crdt: CrdtDocument, nodeId: NodeId): Y.Map<unknown> | undefined {
  return crdt.nodes.get(nodeId);
}

export function getChildrenArray(node: Y.Map<unknown>): Y.Array<NodeId> {
  const children = node.get("children");
  if (!(children instanceof Y.Array)) {
    throw new Error("Invalid node: children must be a Y.Array.");
  }
  return children as Y.Array<NodeId>;
}

export function getAttrsMap(node: Y.Map<unknown>): Y.Map<unknown> {
  const attrs = node.get("attrs");
  if (!(attrs instanceof Y.Map)) {
    throw new Error("Invalid node: attrs must be a Y.Map.");
  }
  return attrs;
}

export function yNodeToSnapshot(node: Y.Map<unknown>): TreeNodeSnapshot {
  return {
    id: requireString(node.get("id"), "node.id"),
    parentId: nullableString(node.get("parentId"), "node.parentId"),
    type: requireString(node.get("type"), "node.type") as TreeNodeSnapshot["type"],
    title: requireString(node.get("title"), "node.title"),
    content: requireString(node.get("content"), "node.content"),
    attrs: recordFromMap<NodeAttrs>(getRequiredMap(node, "attrs")),
    acl: recordFromMap<NodeAcl>(getRequiredMap(node, "acl")),
    children: getChildrenArray(node).toArray(),
    createdBy: requireString(node.get("createdBy"), "node.createdBy"),
    createdAt: requireNumber(node.get("createdAt"), "node.createdAt"),
    updatedBy: requireString(node.get("updatedBy"), "node.updatedBy"),
    updatedAt: requireNumber(node.get("updatedAt"), "node.updatedAt")
  };
}

export function touchDocument(crdt: CrdtDocument, timestamp: number): void {
  crdt.meta.set("updatedAt", timestamp);
}

export function touchNode(node: Y.Map<unknown>, actorId: string, timestamp: number): void {
  node.set("updatedBy", actorId);
  node.set("updatedAt", timestamp);
}

function mapFromRecord(record: object): Y.Map<unknown> {
  const map = new Y.Map<unknown>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, value);
  }
  return map;
}

function arrayFromValues<T>(values: T[]): Y.Array<T> {
  const array = new Y.Array<T>();
  if (values.length > 0) {
    array.insert(0, values);
  }
  return array;
}

function getRequiredMap(node: Y.Map<unknown>, key: string): Y.Map<unknown> {
  const value = node.get(key);
  if (!(value instanceof Y.Map)) {
    throw new Error(`Invalid node: ${key} must be a Y.Map.`);
  }
  return value;
}

function recordFromMap<T>(map: Y.Map<unknown>): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of map.entries()) {
    result[key] = value;
  }
  return result as T;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field}: expected string.`);
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid ${field}: expected string or null.`);
  }
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number") {
    throw new Error(`Invalid ${field}: expected number.`);
  }
  return value;
}
