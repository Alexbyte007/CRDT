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
});
