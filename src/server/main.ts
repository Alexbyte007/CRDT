import { createSampleDocument, sampleUsers } from "../fixtures/sample";
import { createCollaborationServer } from "./app";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const host = process.env.HOST ?? "0.0.0.0";

const server = createCollaborationServer({
  crdt: createSampleDocument(),
  users: sampleUsers
});

server.httpServer.listen(port, host, () => {
  console.log(`CRDT collaboration server listening on http://${host}:${port}`);
});
