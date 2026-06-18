import { AddressInfo } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createCollaborationServer } from "../src/server/app";
import type { CollaborationServer } from "../src/server/types";
import { createSampleDocument, sampleUserAccountSeeds, sampleUsers } from "../src/fixtures/sample";
import { getDocumentSnapshot } from "../src/crdt/snapshot";
import type { ServerMessage, UserView, ViewOperation } from "../src";
import { hashPassword } from "../src/server/auth";

let runningServer: CollaborationServer | undefined;
const execFileAsync = promisify(execFile);

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
    expect(flattenViewIds(body.view)).toEqual([
      "node-root",
      "node-public",
      "node-public-announcement-task",
      "node-public-training-task",
      "node-dev-plan",
      "node-offline-sync-task",
      "node-privacy-view-task",
      "node-delete-conflict-task",
      "node-doc-cleanup-task",
      "node-dev-requirements",
      "node-requirement-review-task",
      "node-api-spec-task",
      "node-frontend-module",
      "node-tree-editing-task",
      "node-operation-log-task"
    ]);
  });

  it("treats the dev-team visibility choice as role-based instead of department-only", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");
    const guest = await login(baseUrl, "u-guest");

    await submitOperation(baseUrl, admin.token, {
      type: "addNode",
      parentId: "node-root",
      nodeId: "node-role-visible",
      title: "研发团队角色可见节点",
      content: ""
    });
    await submitOperation(baseUrl, admin.token, {
      type: "updateAcl",
      nodeId: "node-role-visible",
      aclPatch: {
        visibility: "restricted",
        allowedRoles: ["admin", "manager", "member"]
      }
    });

    const memberView = await fetchView(baseUrl, member.token);
    const guestView = await fetchView(baseUrl, guest.token);

    expect(flattenViewIds(memberView)).toContain("node-role-visible");
    expect(flattenViewIds(guestView)).not.toContain("node-role-visible");
  });

  it("keeps legacy department/all dev-team nodes visible to研发成员", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");

    await submitOperation(baseUrl, admin.token, {
      type: "addNode",
      parentId: "node-root",
      nodeId: "node-legacy-dev-team",
      title: "旧版研发团队节点",
      content: ""
    });
    await submitOperation(baseUrl, admin.token, {
      type: "updateAcl",
      nodeId: "node-legacy-dev-team",
      aclPatch: {
        visibility: "department",
        allowedRoles: ["admin", "manager", "member"]
      }
    });

    const memberView = await fetchView(baseUrl, member.token);

    expect(flattenViewIds(memberView)).toContain("node-legacy-dev-team");
  });

  it("serves frontend controls for deletion and persistent offline queue", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("登录协同空间");
    expect(html).toContain("login-screen");
    expect(html).toContain("删除");
    expect(html).not.toContain("模拟断网");
    expect(html).not.toContain("toggleSimulatedNetwork");
    expect(html).not.toContain('id="connect"');
    expect(html).toContain("登录");
    expect(html).toContain("deleteNode");
    expect(html).toContain("deleteNodeKeepChildren");
    expect(html).toContain("node-actions");
    expect(html).toContain("autoSaveNode");
    expect(html).toContain("restoreEditorFocus");
    expect(html).toContain("添加子节点");
    expect(html).toContain("谁能看");
    expect(html).toContain("谁能改");
    expect(html).toContain("谁能添加子节点");
    expect(html).toContain("谁能删除");
    expect(html).toContain("删除冲突高级权限");
    expect(html).toContain("multi-select");
    expect(html).toContain("multi-select-check");
    expect(html).toContain("点击下拉项可多选，✓ 表示已授权");
    expect(html).toContain("event.preventDefault()");
    expect(html).toContain("selectedUserIds.delete(user.id)");
    expect(html).toContain("node.children && node.children.length > 0");
    expect(html).toContain("无高级授权");
    expect(html).toContain("所有人");
    expect(html).toContain("仅管理员");
    expect(html).toContain("管理员和研发经理");
    expect(html).toContain("管理员和研发团队");
    expect(html).toContain("updateNodeAcl");
    expect(html).toContain("syncOperationAclControls");
    expect(html).toContain("policy.select.disabled = adminOnly");
    expect(html).toContain("/api/delete-impact");
    expect(html).toContain("删除影响分析");
    expect(html).toContain("保留子节点");
    expect(html).toContain("强制删除整棵树");
    expect(html).toContain("showDeleteImpactDialog");
    expect(html).toContain("noticeDialog");
    expect(html).toContain("showNoticeDialog");
    expect(html).toContain("确定");
    expect(html).toContain("用户管理");
    expect(html).toContain("userManagement");
    expect(html).toContain("renderUserManagement");
    expect(html).toContain("updateUserRole");
    expect(html).toContain("updateUserDepartment");
    expect(html).toContain("deleteUserAccount");
    expect(html).toContain("/api/users/");
    expect(html).toContain("formatDeleteRejectedMessage");
    expect(html).toContain("删除被拒绝");
    expect(html).toContain("impact.canResolveConflict");
    expect(html).not.toContain("归档父项目");
    expect(html).toContain("localStorage");
    expect(html).toContain("crdt-editor-offline-queue-v1");
    expect(html).not.toContain("选中节点 ID");
    expect(html).not.toContain("<pre id=\"raw\"");
    expect(html).not.toContain("<button id=\"rename\"");
    expect(html).not.toContain("<button id=\"updateContent\"");
    expect(html).not.toContain("<button id=\"addChild\"");
    expect(html).not.toContain("<button id=\"deleteNode\"");
  });

  it("serves syntactically valid frontend script", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    const tempDir = await mkdtemp(join(tmpdir(), "crdt-page-"));
    const scriptPath = join(tempDir, "page.js");

    expect(script).toBeDefined();
    await writeFile(scriptPath, script ?? "");
    try {
      await execFileAsync(process.execPath, ["--check", scriptPath]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("analyzes delete impact and blocks silent deletion when descendants are visible to others", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const viewResponse = await fetch(`${baseUrl}/api/view`, {
      headers: authHeaders(admin.token)
    });
    const viewBody = (await viewResponse.json()) as { stateVector: string };
    const baseEnvelope = {
      baseStateVector: viewBody.stateVector,
      createdAt: 100
    };

    const batchResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operations: [
          {
            ...baseEnvelope,
            id: "impact-parent",
            operation: {
              type: "addNode",
              parentId: "node-root",
              nodeId: "node-impact-parent",
              title: "删除影响父节点",
              content: ""
            }
          },
          {
            ...baseEnvelope,
            id: "impact-parent-private",
            operation: {
              type: "updateAcl",
              nodeId: "node-impact-parent",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin"]
              }
            }
          },
          {
            ...baseEnvelope,
            id: "impact-child",
            operation: {
              type: "addNode",
              parentId: "node-impact-parent",
              nodeId: "node-impact-public-child",
              title: "其他用户可见子节点",
              content: "这个节点不应被静默删除。"
            }
          },
          {
            ...baseEnvelope,
            id: "impact-child-public",
            operation: {
              type: "updateAcl",
              nodeId: "node-impact-public-child",
              aclPatch: {
                visibility: "public",
                allowedRoles: ["admin", "manager", "member", "guest"]
              }
            }
          }
        ]
      })
    });
    expect(batchResponse.status).toBe(200);

    const impactResponse = await fetch(`${baseUrl}/api/delete-impact?nodeId=node-impact-parent`, {
      headers: authHeaders(admin.token)
    });
    const impact = (await impactResponse.json()) as {
      ok: true;
      deleteCount: number;
      visibleNodes: Array<{ id: string; title: string; visibleTo: string[] }>;
      affectedUsers: Array<{ id: string; name: string }>;
      blocksSilentDelete: boolean;
    };

    expect(impactResponse.status).toBe(200);
    expect(impact.deleteCount).toBe(2);
    expect(impact.blocksSilentDelete).toBe(true);
    expect(impact.visibleNodes).toEqual([
      {
        id: "node-impact-public-child",
        title: "其他用户可见子节点",
        visibleTo: ["u-dev-manager", "u-dev-member", "u-guest"]
      }
    ]);
    expect(impact.affectedUsers.map((user) => user.id)).toEqual([
      "u-dev-manager",
      "u-dev-member",
      "u-guest"
    ]);

    const leafImpactResponse = await fetch(`${baseUrl}/api/delete-impact?nodeId=node-impact-public-child`, {
      headers: authHeaders(admin.token)
    });
    const leafImpact = (await leafImpactResponse.json()) as {
      ok: true;
      deleteCount: number;
      deletedRootVisibleTo: string[];
      visibleNodes: Array<{ id: string }>;
      affectedUsers: Array<{ id: string }>;
      blocksSilentDelete: boolean;
    };

    expect(leafImpactResponse.status).toBe(200);
    expect(leafImpact.deleteCount).toBe(1);
    expect(leafImpact.deletedRootVisibleTo).toEqual([
      "u-dev-manager",
      "u-dev-member",
      "u-guest"
    ]);
    expect(leafImpact.visibleNodes).toEqual([]);
    expect(leafImpact.affectedUsers).toEqual([]);
    expect(leafImpact.blocksSilentDelete).toBe(false);

    const unconfirmedDelete = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-impact-parent"
        }
      })
    });
    const unconfirmedBody = (await unconfirmedDelete.json()) as {
      ok: false;
      error: { name: string; message: string };
    };

    expect(unconfirmedDelete.status).toBe(400);
    expect(unconfirmedBody.error.name).toBe("AccessControlError");
    expect(unconfirmedBody.error.message).toContain("Confirm the impact");
    expect(getDocumentSnapshot(runningServer!.context.crdt).nodes["node-impact-parent"]).toBeDefined();

    const confirmedDelete = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-impact-parent",
          confirmedImpact: true
        }
      })
    });

    expect(confirmedDelete.status).toBe(200);
    const snapshot = getDocumentSnapshot(runningServer!.context.crdt);
    expect(snapshot.nodes["node-impact-parent"]).toBeUndefined();
    expect(snapshot.nodes["node-impact-public-child"]).toBeUndefined();
    expect(snapshot.tombstones["node-impact-parent"]).toBeDefined();
    expect(snapshot.tombstones["node-impact-public-child"]).toBeDefined();
  });

  it("allows direct delete for leaf nodes but requires conflict handling for non-leaf nodes", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    await grantDelete(baseUrl, admin.token, "node-dev-plan", ["admin", "manager"]);
    await grantDelete(baseUrl, admin.token, "node-module-a", ["admin", "manager"]);

    const nonLeafResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-dev-plan"
        }
      })
    });

    expect(nonLeafResponse.status).toBe(400);
    expect(getDocumentSnapshot(runningServer!.context.crdt).nodes["node-dev-plan"]).toBeDefined();

    const leafResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-module-a"
        }
      })
    });

    expect(leafResponse.status).toBe(200);
    const snapshot = getDocumentSnapshot(runningServer!.context.crdt);
    expect(snapshot.nodes["node-module-a"]).toBeUndefined();
    expect(snapshot.nodes["node-dev-plan"]).toBeDefined();
    expect(snapshot.tombstones["node-module-a"]).toBeDefined();
  });

  it("rejects non-admin subtree delete when a child is visible to broader audiences", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    const stateVector = await currentStateVector(baseUrl, admin.token);

    const setupResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operations: [
          {
            id: "broader-parent",
            baseStateVector: stateVector,
            createdAt: 100,
            operation: {
              type: "addNode",
              parentId: "node-root",
              nodeId: "node-broader-parent",
              title: "经理可删父项目",
              content: ""
            }
          },
          {
            id: "broader-parent-acl",
            baseStateVector: stateVector,
            createdAt: 101,
            operation: {
              type: "updateAcl",
              nodeId: "node-broader-parent",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager"],
                deletableRoles: ["admin", "manager"],
                childAddableRoles: ["admin", "manager"]
              }
            }
          },
          {
            id: "broader-child",
            baseStateVector: stateVector,
            createdAt: 102,
            operation: {
              type: "addNode",
              parentId: "node-broader-parent",
              nodeId: "node-broader-child",
              title: "研发成员仍可见子项目",
              content: ""
            }
          },
          {
            id: "broader-child-acl",
            baseStateVector: stateVector,
            createdAt: 103,
            operation: {
              type: "updateAcl",
              nodeId: "node-broader-child",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager", "member"]
              }
            }
          }
        ]
      })
    });
    expect(setupResponse.status).toBe(200);

    const impactResponse = await fetch(`${baseUrl}/api/delete-impact?nodeId=node-broader-parent`, {
      headers: authHeaders(manager.token)
    });
    const impact = (await impactResponse.json()) as {
      ok: true;
      visibleNodes: Array<{ id: string; visibleTo: string[] }>;
      affectedUsers: Array<{ id: string }>;
      blocksSilentDelete: boolean;
    };
    expect(impact.blocksSilentDelete).toBe(true);
    expect(impact.visibleNodes).toEqual([
      {
        id: "node-broader-child",
        title: "研发成员仍可见子项目",
        visibleTo: ["u-admin", "u-dev-member"]
      }
    ]);
    expect(impact.affectedUsers.map((user) => user.id)).toEqual([
      "u-admin",
      "u-dev-member"
    ]);

    const response = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-broader-parent"
        }
      })
    });
    const body = (await response.json()) as { ok: false; error: { name: string; message: string } };

    expect(response.status).toBe(400);
    expect(body.error.name).toBe("AccessControlError");
    expect(body.error.message).toContain("Contact an administrator");
    expect(getDocumentSnapshot(runningServer!.context.crdt).nodes["node-broader-parent"]).toBeDefined();
  });

  it("requires admin or advanced permission to preserve children while deleting an impacted parent", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    const stateVector = await currentStateVector(baseUrl, admin.token);

    const setupResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operations: [
          {
            id: "preserve-parent",
            baseStateVector: stateVector,
            createdAt: 100,
            operation: {
              type: "addNode",
              parentId: "node-root",
              nodeId: "node-preserve-parent",
              title: "保留子节点父项目",
              content: ""
            }
          },
          {
            id: "preserve-parent-acl",
            baseStateVector: stateVector,
            createdAt: 101,
            operation: {
              type: "updateAcl",
              nodeId: "node-preserve-parent",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager"],
                deletableRoles: ["admin", "manager"]
              }
            }
          },
          {
            id: "preserve-child",
            baseStateVector: stateVector,
            createdAt: 102,
            operation: {
              type: "addNode",
              parentId: "node-preserve-parent",
              nodeId: "node-preserve-child",
              title: "被保留子项目",
              content: ""
            }
          },
          {
            id: "preserve-child-acl",
            baseStateVector: stateVector,
            createdAt: 103,
            operation: {
              type: "updateAcl",
              nodeId: "node-preserve-child",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager", "member"]
              }
            }
          }
        ]
      })
    });
    expect(setupResponse.status).toBe(200);

    const forbidden = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNodeKeepChildren",
          nodeId: "node-preserve-parent"
        }
      })
    });
    expect(forbidden.status).toBe(400);

    const allowed = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNodeKeepChildren",
          nodeId: "node-preserve-parent"
        }
      })
    });

    expect(allowed.status).toBe(200);
    const snapshot = getDocumentSnapshot(runningServer!.context.crdt);
    expect(snapshot.nodes["node-preserve-parent"]).toBeUndefined();
    expect(snapshot.nodes["node-preserve-child"]).toBeDefined();
    expect(snapshot.nodes["node-preserve-child"].parentId).toBe("node-root");
  });

  it("allows node-level advanced users to resolve delete conflicts without becoming admins", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    const devMember = await login(baseUrl, "u-dev-member");
    const stateVector = await currentStateVector(baseUrl, admin.token);

    const setupResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operations: [
          {
            id: "advanced-parent",
            baseStateVector: stateVector,
            createdAt: 100,
            operation: {
              type: "addNode",
              parentId: "node-root",
              nodeId: "node-advanced-parent",
              title: "高级权限父项目",
              content: ""
            }
          },
          {
            id: "advanced-parent-acl",
            baseStateVector: stateVector,
            createdAt: 101,
            operation: {
              type: "updateAcl",
              nodeId: "node-advanced-parent",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager"],
                deletableRoles: ["admin", "manager"],
                advancedPermissions: {
                  deleteConflictResolverUserIds: ["u-dev-manager"]
                }
              }
            }
          },
          {
            id: "advanced-child",
            baseStateVector: stateVector,
            createdAt: 102,
            operation: {
              type: "addNode",
              parentId: "node-advanced-parent",
              nodeId: "node-advanced-child",
              title: "高级权限保留子项目",
              content: ""
            }
          },
          {
            id: "advanced-child-acl",
            baseStateVector: stateVector,
            createdAt: 103,
            operation: {
              type: "updateAcl",
              nodeId: "node-advanced-child",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager", "member"]
              }
            }
          }
        ]
      })
    });
    expect(setupResponse.status).toBe(200);

    const impactResponse = await fetch(`${baseUrl}/api/delete-impact?nodeId=node-advanced-parent`, {
      headers: authHeaders(manager.token)
    });
    const impact = (await impactResponse.json()) as {
      ok: true;
      blocksSilentDelete: boolean;
      canResolveConflict: boolean;
    };
    expect(impactResponse.status).toBe(200);
    expect(impact.blocksSilentDelete).toBe(true);
    expect(impact.canResolveConflict).toBe(true);

    const forbidden = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(devMember.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNodeKeepChildren",
          nodeId: "node-advanced-parent"
        }
      })
    });
    expect(forbidden.status).toBe(400);

    const allowed = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(manager.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNodeKeepChildren",
          nodeId: "node-advanced-parent"
        }
      })
    });

    expect(allowed.status).toBe(200);
    const snapshot = getDocumentSnapshot(runningServer!.context.crdt);
    expect(snapshot.nodes["node-advanced-parent"]).toBeUndefined();
    expect(snapshot.nodes["node-advanced-child"]).toBeDefined();
    expect(snapshot.nodes["node-advanced-child"].parentId).toBe("node-root");
  });

  it("blocks public parent deletion when descendants are visible to a different audience", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const guest = await login(baseUrl, "u-guest");
    const stateVector = await currentStateVector(baseUrl, admin.token);

    const setupResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        operations: [
          {
            id: "public-parent",
            baseStateVector: stateVector,
            createdAt: 100,
            operation: {
              type: "addNode",
              parentId: "node-root",
              nodeId: "node-public-parent-with-private-child",
              title: "公开父项目",
              content: ""
            }
          },
          {
            id: "public-parent-acl",
            baseStateVector: stateVector,
            createdAt: 101,
            operation: {
              type: "updateAcl",
              nodeId: "node-public-parent-with-private-child",
              aclPatch: {
                visibility: "public",
                allowedRoles: ["admin", "manager", "member", "guest"],
                deletableRoles: ["admin", "guest"],
                advancedPermissions: {
                  deleteConflictResolverUserIds: ["u-guest"]
                }
              }
            }
          },
          {
            id: "team-child",
            baseStateVector: stateVector,
            createdAt: 102,
            operation: {
              type: "addNode",
              parentId: "node-public-parent-with-private-child",
              nodeId: "node-dev-team-child-under-public",
              title: "研发团队子项目",
              content: ""
            }
          },
          {
            id: "team-child-acl",
            baseStateVector: stateVector,
            createdAt: 103,
            operation: {
              type: "updateAcl",
              nodeId: "node-dev-team-child-under-public",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin", "manager", "member"]
              }
            }
          }
        ]
      })
    });
    expect(setupResponse.status).toBe(200);

    const impactResponse = await fetch(
      `${baseUrl}/api/delete-impact?nodeId=node-public-parent-with-private-child`,
      { headers: authHeaders(guest.token) }
    );
    const impact = (await impactResponse.json()) as {
      ok: true;
      blocksSilentDelete: boolean;
      canResolveConflict: boolean;
      visibleNodes: Array<{ id: string; visibleTo: string[] }>;
    };

    expect(impactResponse.status).toBe(200);
    expect(impact.blocksSilentDelete).toBe(true);
    expect(impact.canResolveConflict).toBe(true);
    expect(impact.visibleNodes).toEqual([
      {
        id: "node-dev-team-child-under-public",
        title: "研发团队子项目",
        visibleTo: ["u-admin", "u-dev-manager", "u-dev-member"]
      }
    ]);

    const unconfirmed = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(guest.token)
      },
      body: JSON.stringify({
        operation: {
          type: "deleteNode",
          nodeId: "node-public-parent-with-private-child"
        }
      })
    });

    expect(unconfirmed.status).toBe(400);
    expect(getDocumentSnapshot(runningServer!.context.crdt).nodes["node-public-parent-with-private-child"]).toBeDefined();
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

  it("lists user management metadata and recalculates permissions after role updates", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const guest = await login(baseUrl, "u-guest");

    const initialGuestView = await fetchView(baseUrl, guest.token);
    expect(flattenViewIds(initialGuestView)).not.toContain("node-dev-plan");

    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders(admin.token)
    });
    const usersBody = (await usersResponse.json()) as {
      users: Array<{
        id: string;
        username: string;
        name: string;
        role: string;
        department: string;
        createdAt: number;
      }>;
    };

    expect(usersResponse.status).toBe(200);
    expect(usersBody.users).toContainEqual(
      expect.objectContaining({
        id: "u-guest",
        username: "guest",
        name: "访客",
        role: "guest",
        department: "external",
        createdAt: expect.any(Number)
      })
    );

    const updateResponse = await fetch(`${baseUrl}/api/users/u-guest`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        role: "member"
      })
    });
    const updateBody = (await updateResponse.json()) as {
      ok: true;
      user: { id: string; username: string; role: string; department: string };
      policyVersion: number;
    };

    expect(updateResponse.status).toBe(200);
    expect(updateBody.user).toMatchObject({
      id: "u-guest",
      username: "guest",
      role: "member",
      department: "dev"
    });

    const sessionResponse = await fetch(`${baseUrl}/api/session`, {
      headers: authHeaders(guest.token)
    });
    const sessionBody = (await sessionResponse.json()) as {
      ok: true;
      user: { id: string; role: string; department: string };
    };
    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.user).toMatchObject({
      id: "u-guest",
      role: "member",
      department: "dev"
    });

    const upgradedGuestView = await fetchView(baseUrl, guest.token);
    expect(flattenViewIds(upgradedGuestView)).toContain("node-dev-plan");
    expect(flattenViewIds(upgradedGuestView)).toContain("node-dev-requirements");

    const editResponse = await fetch(`${baseUrl}/api/operations`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(guest.token)
      },
      body: JSON.stringify({
        operation: {
          type: "updateContent",
          nodeId: "node-dev-requirements",
          content: "访客升级为研发人员后可以编辑允许研发人员编辑的节点。"
        }
      })
    });
    expect(editResponse.status).toBe(200);

    const adminStillActiveResponse = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders(admin.token)
    });
    expect(adminStillActiveResponse.status).toBe(200);
  });

  it("allows admins to delete ordinary users while protecting admins", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");

    const forbiddenDelete = await fetch(`${baseUrl}/api/users/u-guest`, {
      method: "DELETE",
      headers: authHeaders(member.token)
    });
    const forbiddenDeleteBody = (await forbiddenDelete.json()) as {
      ok: false;
      error: { name: string };
    };
    expect(forbiddenDelete.status).toBe(400);
    expect(forbiddenDeleteBody.error.name).toBe("AuthorizationError");

    const selfDelete = await fetch(`${baseUrl}/api/users/u-admin`, {
      method: "DELETE",
      headers: authHeaders(admin.token)
    });
    const selfDeleteBody = (await selfDelete.json()) as {
      ok: false;
      error: { name: string; message: string };
    };
    expect(selfDelete.status).toBe(400);
    expect(selfDeleteBody.error.name).toBe("AuthorizationError");
    expect(selfDeleteBody.error.message).toContain("Cannot delete the current administrator");

    const deleteResponse = await fetch(`${baseUrl}/api/users/u-guest`, {
      method: "DELETE",
      headers: authHeaders(admin.token)
    });
    const deleteBody = (await deleteResponse.json()) as {
      ok: true;
      deletedUserId: string;
      policyVersion: number;
    };
    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.deletedUserId).toBe("u-guest");

    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: authHeaders(admin.token)
    });
    const usersBody = (await usersResponse.json()) as {
      users: Array<{ id: string }>;
    };
    expect(usersResponse.status).toBe(200);
    expect(usersBody.users.map((user) => user.id)).not.toContain("u-guest");

    const deletedLogin = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ username: "guest", password: "guest123" })
    });
    const deletedLoginBody = (await deletedLogin.json()) as {
      ok: false;
      error: { name: string };
    };
    expect(deletedLogin.status).toBe(400);
    expect(deletedLoginBody.error.name).toBe("AuthenticationError");
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

  it("revalidates queued offline operations after a role downgrade", async () => {
    const { baseUrl } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const manager = await login(baseUrl, "u-dev-manager");
    const stateVector = await currentStateVector(baseUrl, manager.token);

    const updateResponse = await fetch(`${baseUrl}/api/users/u-dev-manager`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        ...authHeaders(admin.token)
      },
      body: JSON.stringify({
        role: "guest",
        department: "external"
      })
    });

    expect(updateResponse.status).toBe(200);

    const reloggedManager = await login(baseUrl, "u-dev-manager");
    const replayResponse = await fetch(`${baseUrl}/api/operations/batch`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...authHeaders(reloggedManager.token)
      },
      body: JSON.stringify({
        operations: [
          {
            id: "op-manager-before-downgrade",
            userId: "u-dev-manager",
            baseStateVector: stateVector,
            createdAt: 42,
            operation: {
              type: "addNode",
              parentId: "node-dev-requirements",
              nodeId: "node-queued-before-downgrade",
              title: "降级前离线新增",
              content: "这个操作应按访客身份重新校验并拒绝。"
            }
          }
        ]
      })
    });
    const replayBody = (await replayResponse.json()) as {
      ok: true;
      applied: string[];
      rejected: Array<{ id?: string; error: { name: string; code?: string } }>;
      view: UserView;
    };

    expect(replayResponse.status).toBe(200);
    expect(replayBody.applied).toEqual([]);
    expect(replayBody.rejected).toHaveLength(1);
    expect(replayBody.rejected[0]).toMatchObject({
      id: "op-manager-before-downgrade",
      error: { name: "AccessControlError" }
    });
    expect(["TARGET_NOT_VISIBLE", "ACCESS_DENIED"]).toContain(replayBody.rejected[0].error.code);
    expect(flattenViewIds(replayBody.view)).not.toContain("node-dev-requirements");
    expect(getDocumentSnapshot(runningServer!.context.crdt).nodes["node-queued-before-downgrade"]).toBeUndefined();
  });

  it("broadcasts recalculated WebSocket views after role changes", async () => {
    const { baseUrl, port } = await startTestServer();
    const admin = await login(baseUrl, "u-admin");
    const member = await login(baseUrl, "u-dev-member");
    const memberSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${member.token}`);

    try {
      const initial = await nextMessage(memberSocket);
      expect(initial.type).toBe("view");
      expect(initial.type === "view" ? flattenViewIds(initial.view) : []).toContain("node-dev-plan");

      const memberLosesDevNodes = waitForMessage(
        memberSocket,
        (message) => message.type === "view" && !flattenViewIds(message.view).includes("node-dev-plan")
      );

      const updateResponse = await fetch(`${baseUrl}/api/users/u-dev-member`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...authHeaders(admin.token)
        },
        body: JSON.stringify({
          role: "guest",
          department: "external"
        })
      });
      expect(updateResponse.status).toBe(200);

      const updated = await memberLosesDevNodes;
      expect(updated.type).toBe("view");
      expect(updated.type === "view" ? flattenViewIds(updated.view) : []).toEqual([
        "node-root",
        "node-public",
        "node-public-announcement-task",
        "node-public-training-task"
      ]);
    } finally {
      memberSocket.close();
    }
  });

  it("registers a new guest account and logs in with password", async () => {
    const { baseUrl } = await startTestServer();

    const registerResponse = await fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "newuser",
        displayName: "新用户",
        password: "pass123",
        confirmPassword: "pass123"
      })
    });

    const registerBody = await registerResponse.json();

    expect(registerResponse.status).toBe(200);
    expect(registerBody.user.role).toBe("guest");
    expect(registerBody.user.department).toBe("external");
    expect(registerBody.token.length).toBeGreaterThan(0);

    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "newuser",
        password: "pass123"
      })
    });

    expect(loginResponse.status).toBe(200);
  });

  it("rejects duplicate usernames during registration", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        displayName: "重复管理员",
        password: "pass123",
        confirmPassword: "pass123"
      })
    });

    expect(response.status).toBe(400);
  });

  it("rejects registration when password confirmation does not match", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "mismatch",
        displayName: "密码不一致",
        password: "pass123",
        confirmPassword: "pass456"
      })
    });

    expect(response.status).toBe(400);
  });

  it("rejects login with wrong password", async () => {
    const { baseUrl } = await startTestServer();

    const response = await fetch(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "admin",
        password: "wrong-password"
      })
    });

    expect(response.status).toBe(400);
  });

  it("does not store password in plain text", async () => {
    const { baseUrl } = await startTestServer();

    await fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "hashed-user",
        displayName: "哈希用户",
        password: "secret123",
        confirmPassword: "secret123"
      })
    });

    const account = runningServer!.context.accounts.get("hashed-user");

    expect(account).toBeDefined();
    expect(account!.passwordHash).not.toBe("secret123");
    expect(account!.passwordHash).toContain("scrypt$");
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

  it("removes a node from non-admin WebSocket views after its visibility becomes admin-only", async () => {
    const { port } = await startTestServer();
    const admin = await login(`http://127.0.0.1:${port}`, "u-admin");
    const member = await login(`http://127.0.0.1:${port}`, "u-dev-member");
    const adminSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${admin.token}`);
    const memberSocket = new WebSocket(`ws://127.0.0.1:${port}/ws?token=${member.token}`);

    try {
      const adminInitial = await nextMessage(adminSocket);
      await nextMessage(memberSocket);

      const memberCanSeeAddedNode = waitForMessage(
        memberSocket,
        (message) => message.type === "view" && flattenViewIds(message.view).includes("node-admin-private-ws")
      );

      adminSocket.send(
        JSON.stringify({
          type: "operation",
          envelope: {
            id: "op-ws-private-child-add",
            userId: "u-admin",
            baseStateVector:
              adminInitial.type === "view" ? adminInitial.stateVector : "unexpected-state-vector",
            createdAt: 42,
            operation: {
              type: "addNode",
              parentId: "node-dev-plan",
              nodeId: "node-admin-private-ws",
              title: "管理员私有节点 A",
              content: "研发成员不应看到这个节点。"
            }
          }
        })
      );

      await memberCanSeeAddedNode;

      const memberLosesPrivateNode = waitForMessage(
        memberSocket,
        (message) => message.type === "view" && !flattenViewIds(message.view).includes("node-admin-private-ws")
      );
      const adminKeepsPrivateNode = waitForMessage(
        adminSocket,
        (message) => message.type === "view" && flattenViewIds(message.view).includes("node-admin-private-ws")
      );

      adminSocket.send(
        JSON.stringify({
          type: "operation",
          envelope: {
            id: "op-ws-private-child-acl",
            userId: "u-admin",
            baseStateVector:
              adminInitial.type === "view" ? adminInitial.stateVector : "unexpected-state-vector",
            createdAt: 43,
            operation: {
              type: "updateAcl",
              nodeId: "node-admin-private-ws",
              aclPatch: {
                visibility: "restricted",
                allowedRoles: ["admin"],
                contentEditableRoles: ["admin"],
                childAddableRoles: ["admin"],
                deletableRoles: ["admin"]
              }
            }
          }
        })
      );

      const memberUpdated = await memberLosesPrivateNode;
      const adminUpdated = await adminKeepsPrivateNode;

      expect(memberUpdated.type).toBe("view");
      expect(adminUpdated.type).toBe("view");
    } finally {
      adminSocket.close();
      memberSocket.close();
    }
  });
});

const credentialsByUserId: Record<string, { username: string; password: string }> = {
  "u-admin": { username: "admin", password: "admin123" },
  "u-dev-manager": { username: "manager", password: "manager123" },
  "u-dev-member": { username: "member", password: "member123" },
  "u-guest": { username: "guest", password: "guest123" }
};

async function login(baseUrl: string, userId: string): Promise<{ token: string }> {
  const credentials = credentialsByUserId[userId];

  expect(credentials).toBeDefined();

  const response = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(credentials)
  });

  const body = (await response.json()) as { ok: true; token: string };

  expect(response.status).toBe(200);
  expect(body.token.length).toBeGreaterThan(0);

  return { token: body.token };
}

async function fetchView(baseUrl: string, token: string): Promise<UserView> {
  const response = await fetch(`${baseUrl}/api/view`, {
    headers: authHeaders(token)
  });
  const body = (await response.json()) as { view: UserView };
  expect(response.status).toBe(200);
  return body.view;
}

async function submitOperation(baseUrl: string, token: string, operation: ViewOperation): Promise<void> {
  const response = await fetch(`${baseUrl}/api/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({ operation })
  });
  expect(response.status).toBe(200);
}

async function currentStateVector(baseUrl: string, token: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/view`, {
    headers: authHeaders(token)
  });
  const body = (await response.json()) as { stateVector: string };
  expect(response.status).toBe(200);
  return body.stateVector;
}

async function grantDelete(baseUrl: string, token: string, nodeId: string, roles: string[]): Promise<void> {
  const response = await fetch(`${baseUrl}/api/operations`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...authHeaders(token)
    },
    body: JSON.stringify({
      operation: {
        type: "updateAcl",
        nodeId,
        aclPatch: {
          deletableRoles: roles
        }
      }
    })
  });
  expect(response.status).toBe(200);
}

function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`
  };
}

function createTestUserAccounts() {
  return sampleUserAccountSeeds.map((seed) => ({
    id: seed.id,
    username: seed.username,
    name: seed.name,
    role: seed.role,
    department: seed.department,
    passwordHash: hashPassword(seed.password),
    createdAt: 42
  }));
}

async function startTestServer(): Promise<{ baseUrl: string; port: number }> {
  runningServer = createCollaborationServer({
    crdt: createSampleDocument(),
    users: sampleUsers,
    userAccounts: createTestUserAccounts(),
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
