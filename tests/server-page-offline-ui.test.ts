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
});
