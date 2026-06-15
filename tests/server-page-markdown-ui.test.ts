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

  it("renders direct editable Markdown preview helpers", () => {
    const html = renderHomePage();

    expect(html).toContain("data-md-preview-editable");
    expect(html).toContain("bindEditableMarkdownPreview");
    expect(html).toContain("markdownPreviewToMarkdown");
    expect(html).toContain("syncMarkdownDraftFromPreview");
    expect(html).toContain("skipPreviewElement");
  });

  it("renders stable caret restore and block format menu helpers", () => {
    const html = renderHomePage();

    expect(html).toContain("captureContentEditableSelection");
    expect(html).toContain("restoreContentEditableSelection");
    expect(html).toContain("data-md-preview-scope");
    expect(html).toContain("markdownBlockMenuTrigger");
    expect(html).toContain("markdownBlockMenuPanel");
    expect(html).toContain("applyMarkdownBlockFormat");
    expect(html).toContain("data-md-block-format");
    expect(html).toContain("highlight");
    expect(html).toContain("todo-list");
  });
});
