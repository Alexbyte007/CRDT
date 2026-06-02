import { createSampleDocument, sampleUsers } from "../fixtures/sample";
import { createCollaborationServer } from "./app";
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
const crdt = documentStore.loadOrCreate(() => createSampleDocument());

const server = createCollaborationServer({
  crdt,
  users: sampleUsers,
  documentStore
});

server.httpServer.listen(port, host, () => {
  console.log(`CRDT collaboration server listening on http://${host}:${port}`);
  console.log(`CRDT document persistence: ${documentStore.databasePath}`);
});
