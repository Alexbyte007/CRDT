import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addNode } from "../src/crdt/operations";
import { getNodeSnapshot } from "../src/crdt/snapshot";
import { createSampleDocument } from "../src/fixtures/sample";
import { createSqliteDocumentStore } from "../src/server/persistence";

let tempDir: string | undefined;

afterEach(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("SQLite document persistence", () => {
  it("loads the last saved Yjs document update", () => {
    tempDir = mkdtempSync(join(tmpdir(), "crdt-sqlite-"));
    const databasePath = join(tempDir, "crdt.sqlite");
    const firstStore = createSqliteDocumentStore({
      databasePath,
      docId: "doc-sample",
      sqliteCommand: "sqlite3"
    });
    const crdt = firstStore.loadOrCreate(() => createSampleDocument());

    addNode(crdt, {
      type: "addNode",
      parentId: "node-root",
      actorId: "u-admin",
      timestamp: 10,
      node: {
        id: "node-persisted",
        type: "doc",
        title: "持久化节点",
        content: "重启后仍应存在",
        attrs: {
          department: "all",
          ownerId: "u-admin",
          status: "active"
        },
        acl: {
          visibility: "public",
          allowedRoles: ["admin", "manager", "member", "guest"],
          editableRoles: ["admin"],
          allowedUsers: [],
          deniedUsers: []
        },
        createdBy: "u-admin"
      }
    });
    firstStore.save(crdt);

    const secondStore = createSqliteDocumentStore({
      databasePath,
      docId: "doc-sample",
      sqliteCommand: "sqlite3"
    });
    const restored = secondStore.loadOrCreate(() => createSampleDocument());

    expect(getNodeSnapshot(restored, "node-persisted")?.content).toBe("重启后仍应存在");
  });
});
