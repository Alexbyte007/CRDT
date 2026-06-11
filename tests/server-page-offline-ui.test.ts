import { describe, expect, it } from "vitest";
import { renderHomePage } from "../src/server/page";

describe("home page simulated offline controls", () => {
  it("renders simulated offline state and toggle hooks", () => {
    const html = renderHomePage();

    expect(html).toContain("simulated: false");
    expect(html).toContain("toggleSimulatedNetwork");
    expect(html).toContain("模拟断网");
    expect(html).toContain("恢复联网");
    expect(html).toContain("模拟离线中，操作已进入队列");
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
    expect(html).toContain("markConnectionStale");
    expect(html).toContain("HEARTBEAT_INTERVAL_MS = 5_000");
    expect(html).toContain("HEARTBEAT_TIMEOUT_MS = 15_000");
    expect(html).toContain("HEARTBEAT_TIMEOUT_MS");
    expect(html).toContain("autoSyncOfflineQueue");
    expect(html).toContain("autoReconnectIfNeeded");
    expect(html).toContain("心跳超时");
    expect(html).toContain("最后心跳");
    expect(html).toContain("最后同步");
  });
});
