import { describe, expect, it } from "vitest";
import { ALL_INCLUDED, makeExportDoc } from "@/utils/collectionExport/exportFixture";
import { renderMarkdown } from "@/utils/collectionExport/renderMarkdown";

describe("renderMarkdown", () => {
  it("renders both collections and a BattleReadyShelf footer with the export date", () => {
    const md = renderMarkdown(makeExportDoc(), "summary");

    expect(md).toContain("<script>x</script>");
    expect(md).toContain("# Second Collection");
    expect(md).toMatch(/BattleReadyShelf/);
    expect(md).toMatch(/2026-11-20/);
  });

  it("omits content when the matching included flag is false", () => {
    const md = renderMarkdown(
      makeExportDoc({
        ...ALL_INCLUDED,
        collectionDescription: false,
        faction: false,
        status: false,
        paintRecipes: false,
        wargear: false,
      }),
      "summary",
    );

    expect(md).not.toContain("First collection description");
    expect(md).not.toContain("Death Guard");
    expect(md).not.toContain("Painted");
    expect(md).not.toContain("Paint recipe");
    expect(md).not.toContain("Boltgun");
  });

  it("summary collapses identical loadouts and omits miniature-only fields", () => {
    const md = renderMarkdown(makeExportDoc(), "summary");

    expect(md).toMatch(/2×\s+Boltgun,\s+Plague knife/);
    expect(md).not.toContain("Champion");
    expect(md).not.toContain("Boss guy");
    expect(md).not.toContain("Miniature-only recipe");
    expect(md).not.toContain("2026-10-02T18:30:00Z");
  });

  it("every miniature shows names, descriptions and status history when included", () => {
    const md = renderMarkdown(makeExportDoc(), "every");

    expect(md).toContain("Champion");
    expect(md).toContain("Boss guy");
    expect(md).toContain("Painted");
    expect(md).toContain("2026-10-02T18:30:00Z");
    expect(md).toContain("Miniature-only recipe");
  });

  it("escapes Markdown heading markers in model type names", () => {
    const md = renderMarkdown(makeExportDoc(), "summary");

    expect(md).toContain("## \\# Evil Heading");
    expect(md).not.toMatch(/^## # Evil Heading/m);
  });

  it("labels unnamed miniatures by position within the type", () => {
    const md = renderMarkdown(makeExportDoc(), "every");

    expect(md).toMatch(/#2|# 2|Miniature 2|Unnamed 2/i);
  });
});
