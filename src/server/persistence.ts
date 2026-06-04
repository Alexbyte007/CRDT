import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as Y from "yjs";
import { fromYDoc, type CrdtDocument } from "../crdt/document";
import type { UserAccount } from "./types";

export interface SqliteDocumentStoreOptions {
  databasePath: string;
  docId: string;
  sqliteCommand?: string;
}

export interface SqliteDocumentStore {
  databasePath: string;
  loadOrCreate(factory: () => CrdtDocument): CrdtDocument;
  save(crdt: CrdtDocument): void;

  loadUserAccounts(): UserAccount[];
  saveUserAccount(account: UserAccount): void;
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
    },
    loadUserAccounts() {
      const rows = queryJson<{
        id: string;
        username: string;
        name: string;
        role: UserAccount["role"];
        department: string;
        password_hash: string;
        created_at: number;
      }>(
        sqliteCommand,
        databasePath,
        `
          SELECT id, username, name, role, department, password_hash, created_at
          FROM user_accounts
          ORDER BY created_at ASC;
        `
      );

      return rows.map((row) => ({
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role,
        department: row.department,
        passwordHash: row.password_hash,
        createdAt: row.created_at
      }));
    },
    saveUserAccount(account) {
      runSql(
        sqliteCommand,
        databasePath,
        `
          INSERT INTO user_accounts (
            id, username, name, role, department, password_hash, created_at
          )
          VALUES (
            ${sqlString(account.id)},
            ${sqlString(account.username)},
            ${sqlString(account.name)},
            ${sqlString(account.role)},
            ${sqlString(account.department)},
            ${sqlString(account.passwordHash)},
            ${account.createdAt}
          );
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

      CREATE TABLE IF NOT EXISTS user_accounts (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
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

function queryJson<T>(sqliteCommand: string, databasePath: string, sql: string): T[] {
  const raw = execFileSync(sqliteCommand, ["-batch", "-json", databasePath], {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"]
  }).trim();

  return raw ? (JSON.parse(raw) as T[]) : [];
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
