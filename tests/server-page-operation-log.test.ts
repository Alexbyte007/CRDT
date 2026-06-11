import { describe, expect, it } from "vitest";
import { renderHomePage } from "../src/server/page";

describe("home page operation log UI", () => {
  it("renders operation log helpers for readable local and remote messages", () => {
    const html = renderHomePage();

    expect(html).toContain("formatViewOperation");
    expect(html).toContain("resolveNodeTitle");
    expect(html).toContain("appendOperationLog");
    expect(html).toContain("renderOperationLogs");
    expect(html).toContain("修改节点「");
    expect(html).toContain("新增子节点「");
    expect(html).toContain("服务端已合并本操作");
  });

  it("does not log raw operation JSON and exposes typed log styles", () => {
    const html = renderHomePage();

    expect(html).not.toContain('pushLog("local", logTitle, JSON.stringify(operation))');
    expect(html).toContain("operationLogLimit");
    expect(html).toContain("operationLogKeys");
    expect(html).toContain("employee-log-item local");
    expect(html).toContain("employee-log-item remote");
    expect(html).toContain("employee-log-item failed");
    expect(html).toContain("删除失败：");
  });
});
