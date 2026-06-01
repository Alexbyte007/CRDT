import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as Y from "yjs";
import { fromYDoc, type CrdtDocument } from "../crdt/document";

export interface SqliteDocumentStoreOptions {
  databasePath: string;
  docId: string;
  sqliteCommand?: string;
}

export interface SqliteDocumentStore {
  databasePath: string;
  loadOrCreate(factory: () => CrdtDocument): CrdtDocument;
  save(crdt: CrdtDocument): void;
}

export function createSqliteDocumentStore(
  options: SqliteDocumentStoreOptions
): SqliteDocumentStore {
  const databasePath = resolve(options.databasePath);
  const sqliteCommand = options.sqliteCommand ?? "sqlite3";
  const docId = options.docId;

  mkdirSync(dirname(databasePath), { recursive: true });
  ensureSchema(sqliteCommand, databasePath);

  return {
    databasePath,
    loadOrCreate(factory) {
      const encoded = querySingleValue(
        sqliteCommand,
        databasePath,
        `SELECT update_base64 FROM crdt_documents WHERE doc_id = ${sqlString(docId)} LIMIT 1;`
      );

      if (encoded) {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, Uint8Array.from(Buffer.from(encoded, "base64")));
        return fromYDoc(ydoc);
      }

      const crdt = factory();
      this.save(crdt);
      return crdt;
    },
    save(crdt) {
      const updateBase64 = Buffer.from(Y.encodeStateAsUpdate(crdt.doc)).toString("base64");
      runSql(
        sqliteCommand,
        databasePath,
        `
          INSERT INTO crdt_documents (doc_id, update_base64, updated_at)
          VALUES (${sqlString(docId)}, ${sqlString(updateBase64)}, strftime('%s','now'))
          ON CONFLICT(doc_id) DO UPDATE SET
            update_base64 = excluded.update_base64,
            updated_at = excluded.updated_at;
        `
      );
    }
  };
}

function ensureSchema(sqliteCommand: string, databasePath: string): void {
  runSql(
    sqliteCommand,
    databasePath,
    `
      CREATE TABLE IF NOT EXISTS crdt_documents (
        doc_id TEXT PRIMARY KEY,
        update_base64 TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `
  );
}

function runSql(sqliteCommand: string, databasePath: string, sql: string): void {
  execFileSync(sqliteCommand, ["-batch", databasePath], {
    input: sql,
    stdio: ["pipe", "pipe", "pipe"]
  });
}

function querySingleValue(sqliteCommand: string, databasePath: string, sql: string): string {
  return execFileSync(sqliteCommand, ["-batch", "-noheader", databasePath], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
