import { describe, expect, it } from "vitest";
import { renderHomePage } from "../src/server/page";

describe("home page real offline controls", () => {
  it("removes simulated offline controls and keeps real offline hooks", () => {
    const html = renderHomePage();

    expect(html).not.toContain("toggleSimulatedNetwork");
    expect(html).not.toContain("模拟断网");
    expect(html).not.toContain('id="connect"');
    expect(html).toContain("WebSocket 离线，操作已进入队列");
    expect(html).toContain("autoReconnectIfNeeded");
  });

  it("renders reliable offline queue and heartbeat helpers", () => {
    const html = renderHomePage();

    expect(html).toContain("status: \"pending\"");
    expect(html).toContain("item.status = \"sending\"");
    expect(html).toContain("status = \"acked\"");
    expect(html).toContain("status = \"rejected\"");
    expect(html).toContain("compactOfflineQueue");
    expect(html).toContain("syncableQueueForCurrentUser");
    expect(html).toContain("ACK_RETENTION_MS");
    expect(html).toContain("MAX_REJECTED_ITEMS");
    expect(html).toContain("MAX_QUEUE_SIZE");
    expect(html).toContain("sendHeartbeat");
    expect(html).toContain("lastPongAt");
    expect(html).toContain("needsRecoveryLog");
    expect(html).toContain("markConnectionStale");
    expect(html).toContain("HEARTBEAT_INTERVAL_MS = 5_000");
    expect(html).toContain("HEARTBEAT_TIMEOUT_MS = 15_000");
    expect(html).toContain("HEARTBEAT_TIMEOUT_MS");
    expect(html).toContain("autoSyncOfflineQueue");
    expect(html).toContain("autoReconnectIfNeeded");
    expect(html).toContain("markCurrentUserSendingItemsPending");
    expect(html).toContain("logOfflineQueued");
    expect(html).toContain("logQueuedWaiting");
    expect(html).toContain("localLogWithQueueEntries");
    expect(html).toContain("正在发送：");
    expect(html).toContain("等待同步：");
    expect(html).toContain("网络不可用，操作已进入离线队列");
    expect(html).toContain("网络不可用，离线队列已保留，稍后会自动重试");
    expect(html).toContain("当前离线，删除操作已进入队列，重连后会重新校验");
    expect(html).toContain("Network response ended before a valid JSON body was available.");
    expect(html).toContain("markConnectionUnavailable");
    expect(html).toContain("已合并：");
    expect(html).toContain("已跳过：");
    expect(html).toContain("已拒绝：");
    expect(html).toContain("心跳超时");
    expect(html).toContain("连接已恢复");
    expect(html).toContain("已收到服务器心跳响应，开始同步离线队列");
    expect(html).toContain("最后心跳");
    expect(html).toContain("最后同步");
  });

  it("optimistically applies offline tree operations before server confirmation", () => {
    const html = renderHomePage();

    expect(html).toContain("applyOptimisticOperation");
    expect(html).toContain("optimisticNodeFromAddOperation");
    expect(html).toContain("ensureAddOperationNodeId");
    expect(html).toContain("createClientNodeId");
    expect(html).toContain("removeNodeFromView");
    expect(html).toContain("本地视图已更新");
    expect(html).toContain("联网后会与服务端重新校验合并");
    expect(html).toContain("loadView()");
  });

  it("guards undo and redo against repeated clicks while a request is in flight", () => {
    const html = renderHomePage();

    expect(html).toContain("undoInFlight");
    expect(html).toContain("redoInFlight");
    expect(html).toContain("state.undo.undoInFlight = true");
    expect(html).toContain("state.undo.redoInFlight = true");
    expect(html).toContain("state.undo.undoInFlight = false");
    expect(html).toContain("state.undo.redoInFlight = false");
  });
});
