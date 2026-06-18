import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerAwarenessManager } from "../src/server/awareness";

describe("server awareness manager", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps online users alive when heartbeat touch refreshes lastSeen", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    const manager = new ServerAwarenessManager();
    manager.update("u-admin", "管理员", { nodeId: undefined });

    vi.setSystemTime(55_000);
    manager.touch("u-admin", "管理员");

    vi.setSystemTime(110_000);
    expect(manager.getAllStates()).toHaveLength(1);

    vi.setSystemTime(116_001);
    expect(manager.getAllStates()).toHaveLength(0);
  });
});
