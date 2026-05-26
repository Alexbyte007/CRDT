import * as Y from "yjs";
import type { CrdtDocument } from "./document";

export function encodeStateVector(crdt: CrdtDocument): string {
  return bytesToBase64(Y.encodeStateVector(crdt.doc));
}

export function decodeStateVector(baseStateVector: string): Uint8Array {
  return base64ToBytes(baseStateVector);
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}
