import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createCollaborationServer } from "../src/server/app";
import type { CollaborationServer } from "../src/server/types";
import { createSampleDocument, sampleUsers } from "../src/fixtures/sample";
import type { ServerMessage, UserView } from "../src";

let runningServer: CollaborationServer | undefined;

afterEach(async () => {
  if (!runningServer) {
    return;
  }

  await closeServer(runningServer);
  runningServer = undefined;
});

describe("collaboration server", () => {
  it("serves user-specific views over HTTP", async () => {
    const { baseUrl } = await startTestServer();
    const member = await login(baseUrl, "u-dev-member");

    const response = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(member.token)
    });
    const body = (await response.json()) as { view: UserView; stateVector: string };

    expect(response.status).toBe(200);
    expect(body.stateVector.length).toBeGreaterThan(0);
    expect(flattenViewIds(body.view)).toEqual(["node-root", "node-public", "node-dev-plan"]);
  });

  it("serves frontend controls for deletion and persistent offline queue", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("登录协同空间");
    expect(html).toContain("login-screen");
    expect(html).toContain("删除");
    expect(html).toContain("联网");
    expect(html).toContain("断网");
    expect(html).toContain("登录");
    expect(html).toContain("deleteNode");
    expect(html).toContain("node-actions");
    expect(html).toContain("autoSaveNode");
    expect(html).toContain("restoreEditorFocus");
    expect(html).toContain("添加子节点");
    expect(html).toContain("谁能看");
    expect(html).toContain("所有人可见");
    expect(html).toContain("仅管理员可见");
    expect(html).toContain("管理员和研发经理可见");
    expect(html).toContain("研发团队可见");
    expect(html).toContain("updateNodeAudience");
    expect(html).toContain("localStorage");
    expect(html).toContain("crdt-editor-offline-queue-v1");
    expect(html).not.toContain("用户与权限管理");
    expect(html).not.toContain("选中节点 ID");
    expect(html).not.toContain("<pre id=\"raw\"");
    expect(html).not.toContain("<button id=\"rename\"");
    expect(html).not.toContain("<button id=\"updateContent\"");
    expect(html).not.toContain("<button id=\"addChild\"");
    expect(html).not.toContain("<button id=\"deleteNode\"");
  });

  it("accepts authorized HTTP operations and returns the updated user view", async () => {
    const { baseUrl } = await startTestServer();
    const manager = await login(baseUrl, "u-dev-manager");

    const response = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "addNode",
          parentId: "node-dev-plan",
          nodeId: "node-http",
          title: "HTTP 接口节点",
          content: "从 HTTP 写入"
        }
      })
    });
    const body = (await response.json()) as { ok: true; view: UserView };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(flattenViewIds(body.view)).toContain("node-http");
  });

  it("accepts operation envelopes and deduplicates repeated operation ids over HTTP", async () => {
    const { baseUrl } = await startTestServer();
    const manager = await login(baseUrl, "u-dev-manager");
    const viewResponse = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(manager.token)
    });
    const viewBody = (await viewResponse.json()) as { view: UserView; stateVector: string };
    const envelope = {
      id: "op-http-envelope-1",
      userId: "u-admin",
      baseStateVector: viewBody.stateVector,
      createdAt: 42,
      operation: {
        type: "addNode",
        parentId: "node-dev-plan",
        nodeId: "node-envelope",
        title: "Envelope 节点",
        content: "从 envelope 写入"
      }
    };

    const firstResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({ envelope })
    });
    const firstBody = (await firstResponse.json()) as {
      ok: true;
      view: UserView;
      operationId: string;
      deduplicated: boolean;
      stateVector: string;
    };

    expect(firstResponse.status).toBe(200);
    expect(firstBody.operationId).toBe("op-http-envelope-1");
    expect(firstBody.deduplicated).toBe(false);
    expect(flattenViewIds(firstBody.view)).toContain("node-envelope");

    const secondResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({ envelope })
    });
    const secondBody = (await secondResponse.json()) as {
      ok: true;
      view: UserView;
      operationId: string;
      deduplicated: boolean;
      stateVector: string;
    };

    expect(secondResponse.status).toBe(200);
    expect(secondBody.operationId).toBe("op-http-envelope-1");
    expect(secondBody.deduplicated).toBe(true);
    expect(flattenViewIds(secondBody.view).filter((id) => id === "node-envelope")).toHaveLength(1);
  });

  it("accepts batch operations with applied, skipped, and rejected results", async () => {
    const { baseUrl } = await startTestServer();
    const manager = await login(baseUrl, "u-dev-manager");
    const viewResponse = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(manager.token)
    });
    const viewBody = (await viewResponse.json()) as { view: UserView; stateVector: string };
    const baseEnvelope = {
      baseStateVector: viewBody.stateVector,
      createdAt: 42
    };

    const response = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operations: [
          {
            ...baseEnvelope,
            id: "op-batch-add",
            operation: {
              type: "addNode",
              parentId: "node-dev-plan",
              nodeId: "node-batch",
              title: "批量新增节点",
              content: "批量接口写入"
            }
          },
          {
            ...baseEnvelope,
            id: "op-batch-add",
            operation: {
              type: "addNode",
              parentId: "node-dev-plan",
              nodeId: "node-batch-duplicate",
              title: "重复操作",
              content: "这一条应该被跳过"
            }
          },
          {
            ...baseEnvelope,
            id: "op-batch-forbidden",
            operation: {
              type: "renameNode",
              nodeId: "node-finance",
              title: "非法重命名"
            }
          }
        ]
      })
    });
    const body = (await response.json()) as {
      ok: true;
      applied: string[];
      skipped: string[];
      rejected: Array<{ id?: string; error: { name: string; message: string } }>;
      view: UserView;
      stateVector: string;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.applied).toEqual(["op-batch-add"]);
    expect(body.skipped).toEqual(["op-batch-add"]);
    expect(body.rejected).toHaveLength(1);
    expect(body.rejected[0]).toMatchObject({
      id: "op-batch-forbidden",
      error: { name: "AccessControlError" }
    });
    expect(body.stateVector.length).toBeGreaterThan(0);
    expect(flattenViewIds(body.view)).toContain("node-batch");
    expect(flattenViewIds(body.view)).not.toContain("node-batch-duplicate");
  });

  it("rejects forbidden HTTP operations", async () => {
    const { baseUrl } = await startTestServer();
    const member = await login(baseUrl, "u-dev-member");

    const response = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(member.token)
      },
      body: JSON.stringify({
        operation: {
          type: "renameNode",
          nodeId: "node-finance",
          title: "非法修改"
        }
      })
    });
    const body = (await response.json()) as { ok: false; error: { name: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.name).toBe("AccessControlError");
  });

  it("allows only admins to list and update users", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");

    const forbiddenList = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders(member.token)
    });
    const forbiddenListBody = (await forbiddenList.json()) as {
      ok: false;
      error: { name: string };
    };
    expect(forbiddenList.status).toBe(400);
    expect(forbiddenListBody.error.name).toBe("AuthorizationError");

    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders(admin.token)
    });
    const usersBody = (await usersResponse.json()) as {
      users: Array<{ id: string; role: string; department: string }>;
    };
    expect(usersResponse.status).toBe(200);
    expect(usersBody.users.map((user) => user.id)).toContain("u-dev-member");

    const forbiddenPatch = await fetch(`${baseUrl}/api/users/u-dev-member`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(member.token)
      },
      body: JSON.stringify({ role: "manager" })
    });
    const forbiddenPatchBody = (await forbiddenPatch.json()) as {
      ok: false;
      error: { name: string };
    };
    expect(forbiddenPatch.status).toBe(400);
    expect(forbiddenPatchBody.error.name).toBe("AuthorizationError");
  });

  it("rejects unauthenticated view requests and ignores forged operation user ids", async () => {
    const { baseUrl } = await startTestServer();

    const anonymousResponse = await fetch(`${baseUrl}/api/view?userId=u-admin`);
    const anonymousBody = (await anonymousResponse.json()) as {
      ok: false;
      error: { name: string; message: string };
    };

    expect(anonymousResponse.status).toBe(400);
    expect(anonymousBody.error.name).toBe("AuthenticationError");

    const member = await login(baseUrl, "u-dev-member");
    const viewResponse = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(member.token)
    });
    const viewBody = (await viewResponse.json()) as { stateVector: string };
    const forgedResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(member.token)
      },
      body: JSON.stringify({
        envelope: {
          id: "op-forged-admin",
          userId: "u-admin",
          baseStateVector: viewBody.stateVector,
          createdAt: 42,
          operation: {
            type: "renameNode",
            nodeId: "node-finance",
            title: "伪造管理员修改"
          }
        }
      })
    });
    const forgedBody = (await forgedResponse.json()) as {
      ok: false;
      error: { name: string; message: string };
    };

    expect(forgedResponse.status).toBe(400);
    expect(forgedBody.error.name).toBe("AccessControlError");
  });

  it("invalidates active sessions after an admin changes user permissions", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");

    const updateResponse = await fetch(`${baseUrl}/api/users/u-dev-member`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        role: "manager",
        department: "dev"
      })
    });
    const updateBody = (await updateResponse.json()) as {
      ok: true;
      policyVersion: number;
      sessionsInvalidated: boolean;
    };

    expect(updateResponse.status).toBe(200);
    expect(updateBody.sessionsInvalidated).toBe(true);

    const staleResponse = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(member.token)
    });
    const staleBody = (await staleResponse.json()) as {
      ok: false;
      error: { name: string; message: string };
    };

    expect(staleResponse.status).toBe(400);
    expect(staleBody.error.name).toBe("AuthenticationError");
  });

  it("pushes initial views and broadcasts updates over WebSocket", async () => {
    const { baseUrl, port } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    const adminSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${admin.token}`);
    const managerSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${manager.token}`);

    const adminInitial = await nextMessage(adminSocket);
    const managerInitial = await nextMessage(managerSocket);

    expect(adminInitial.type).toBe("view");
    expect(managerInitial.type).toBe("view");

    managerSocket.send(
      JSON.stringify({
        type: "operation",
        envelope: {
          id: "op-ws-envelope-1",
          userId: "u-dev-manager",
          baseStateVector:
            managerInitial.type === "view" ? managerInitial.stateVector : "unexpected-state-vector",
          createdAt: 42,
          operation: {
          type: "addNode",
          parentId: "node-dev-plan",
          nodeId: "node-ws",
          title: "WebSocket 节点",
          content: "从 WebSocket 写入"
          }
        }
      })
    );

    const managerApplied = await waitForMessage(
      managerSocket,
      (message) =>
        message.type === "operationApplied" &&
        message.operationId === "op-ws-envelope-1" &&
        flattenViewIds(message.view).includes("node-ws")
    );
    const adminBroadcast = await waitForMessage(
      adminSocket,
      (message) => message.type === "view" && flattenViewIds(message.view).includes("node-ws")
    );

    expect(managerApplied.type).toBe("operationApplied");
    expect(adminBroadcast.type).toBe("view");

    adminSocket.close();
    managerSocket.close();
  });
});

async function login(baseUrl: string, userId: string): Promise<{ token: string }> {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ userId })
  });
  const body = (await response.json()) as { ok: true; token: string };
  expect(response.status).toBe(200);
  expect(body.token.length).toBeGreaterThan(0);
  return { token: body.token };
}

function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`
  };
}

async function startTestServer(): Promise<{ baseUrl: string; port: number }> {
  runningServer = createCollaborationServer({
    crdt: createSampleDocument(),
    users: sampleUsers,
    now: () => 42
  });

  await new Promise<void>((resolve) => {
    runningServer!.httpServer.listen(0, "127.0.0.1", resolve);
  });

  const address = runningServer.httpServer.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    port: address.port
  };
}

function closeServer(server: CollaborationServer): Promise<void> {
  return new Promise((resolve, reject) => {
    server.httpServer.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function nextMessage(socket: WebSocket): Promise<ServerMessage> {
  return waitForMessage(socket, () => true);
}

function waitForMessage(
  socket: WebSocket,
  predicate: (message: ServerMessage) => boolean
): Promise<ServerMessage> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for WebSocket message."));
    }, 3000);

    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      if (!predicate(message)) {
        return;
      }

      cleanup();
      resolve(message);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("message", onMessage);
      socket.off("error", onError);
    };

    socket.on("message", onMessage);
    socket.on("error", onError);
  });
}

function flattenViewIds(view: UserView): string[] {
  return view.roots.flatMap((node) => [
    node.id,
    ...node.children.flatMap((child) => flattenNodeIds(child))
  ]);
}

function flattenNodeIds(node: UserView["roots"][number]): string[] {
  return [node.id, ...node.children.flatMap((child) => flattenNodeIds(child))];
}
