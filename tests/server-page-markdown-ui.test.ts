import { describe, expect, it } from "vitest";
import { renderHomePage } from "../src/server/page";

describe("home page node Markdown editor", () => {
  it("renders Markdown editor drawer hooks", () => {
    const html = renderHomePage();

    expect(html).toContain("markdownEditorDrawer");
    expect(html).toContain("markdownEditorMode");
    expect(html).toContain("openMarkdownEditor");
    expect(html).toContain("renderMarkdownEditorDrawer");
  });

  it("renders Markdown authoring and preview helpers", () => {
    const html = renderHomePage();

    expect(html).toContain("markdownToHtml");
    expect(html).toContain("data-markdown-mode");
    expect(html).toContain("data-md-wrap");
    expect(html).toContain("node-markdown-preview");
    expect(html).toContain("编辑 Markdown");
  });
});
