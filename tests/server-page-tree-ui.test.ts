import { describe, expect, it } from "vitest";
import { renderHomePage } from "../src/server/page";

describe("home page hybrid tree UI", () => {
  it("renders separate state and controls for node details and child subtrees", () => {
    const html = renderHomePage();

    expect(html).toContain("expandedDetailNodeIds");
    expect(html).toContain("expandedTreeNodeIds");
    expect(html).toContain("toggleNodeDetails");
    expect(html).toContain("toggleNodeChildren");
    expect(html).toContain("tree-toggle");
  });

  it("renders structural classes for the hybrid tree workspace", () => {
    const html = renderHomePage();

    expect(html).toContain("tree-workspace");
    expect(html).toContain("tree-children-shell");
    expect(html).toContain("node-detail-shell");
    expect(html).toContain("node-child-count");
  });

  it("renders privacy-aware in-tree task filters without a separate table UI", () => {
    const html = renderHomePage();

    expect(html).toContain("taskFilters");
    expect(html).toContain("appendModuleFilterPanel");
    expect(html).toContain("return depth === 1");
    expect(html).toContain("function canAddChildAtDepth(depth)");
    expect(html).toContain("当前只支持三级结构，第三级节点不能再添加子节点");
    expect(html).toContain("当前模块任务筛选");
    expect(html).toContain("预算总额");
    expect(html).toContain("appendTaskAttrsPanel");
    expect(html).toContain("scheduleFilterRender");
    expect(html).toContain("preventScroll");
    expect(html).not.toContain("appendStructuredTableView");
  });
});
