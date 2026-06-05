import { createSampleDocument, sampleUserAccountSeeds } from "../fixtures/sample";
import { createCollaborationServer } from "./app";
import { hashPassword } from "./auth";
import { createSqliteDocumentStore } from "./persistence";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";
const databasePath = process.env.DATABASE_PATH ?? "data/crdt.sqlite";
const docId = process.env.DOC_ID ?? "doc-sample";
const documentStore = createSqliteDocumentStore({
  databasePath,
  docId,
  sqliteCommand: process.env.SQLITE_BIN
});

function createInitialAccounts(now: number) {
  return sampleUserAccountSeeds.map((seed) => ({
    id: seed.id,
    username: seed.username,
    name: seed.name,
    role: seed.role,
    department: seed.department,
    passwordHash: hashPassword(seed.password),
    createdAt: now
  }));
}

const crdt = documentStore.loadOrCreate(() => createSampleDocument());

const persistedAccounts = documentStore.loadUserAccounts();

let userAccounts = persistedAccounts;

if (userAccounts.length === 0) {
  userAccounts = createInitialAccounts(Date.now());
  for (const account of userAccounts) {
    documentStore.saveUserAccount(account);
  }
}

const users = userAccounts.map((account) => ({
  id: account.id,
  username: account.username,
  name: account.name,
  role: account.role,
  department: account.department,
  createdAt: account.createdAt
}));

const server = createCollaborationServer({
  crdt,
  users,
  userAccounts,
  documentStore
});

server.httpServer.listen(port, host, () => {
  console.log(`CRDT collaboration server listening on http://${host}:${port}`);
  console.log(`CRDT document persistence: ${documentStore.databasePath}`);
});
