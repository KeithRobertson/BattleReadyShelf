import { describe, expect, it } from "vitest";
import { ALL_INCLUDED, makeExportDoc } from "@/utils/collectionExport/exportFixture";
import { renderMarkdown } from "@/utils/collectionExport/renderMarkdown";

describe("renderMarkdown", () => {
  it("renders both collections and a BattleReadyShelf footer with the export date", () => {
    const md = renderMarkdown(makeExportDoc(), "summary", { kind: "iso" });

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
      { kind: "iso" },
    );

    expect(md).not.toContain("First collection description");
    expect(md).not.toContain("Death Guard");
    expect(md).not.toContain("Painted");
    expect(md).not.toContain("Paint recipe");
    expect(md).not.toContain("Boltgun");
  });

  it("summary collapses identical loadouts and omits miniature-only fields", () => {
    const md = renderMarkdown(makeExportDoc(), "summary", { kind: "iso" });

    expect(md).toMatch(/2×\s+Boltgun,\s+Plague knife/);
    expect(md).not.toContain("Champion");
    expect(md).not.toContain("Boss guy");
    expect(md).not.toContain("Miniature-only recipe");
    expect(md).not.toContain("2026-10-02T18:30:00Z");
  });

  it("every miniature shows names, descriptions and status history when included", () => {
    const md = renderMarkdown(makeExportDoc(), "every", { kind: "iso" });

    expect(md).toContain("Champion");
    expect(md).toContain("Boss guy");
    expect(md).toContain("Painted");
    expect(md).toContain("2026-10-02T18:30:00Z");
    expect(md).toContain("Miniature-only recipe");
  });

  it("omits status times when time display is off", () => {
    const md = renderMarkdown(makeExportDoc(), "every", { kind: "off" });

    expect(md).toContain("Status: Painted");
    expect(md).toContain("Painted");
    expect(md).not.toContain("2026-10-02T18:30:00Z");
    expect(md).not.toContain("2026-09-01T12:00:00Z");
    expect(md).not.toContain("2026-09-15T10:00:00Z");
  });

  it("formats status times in the Europe/London zone", () => {
    const doc = makeExportDoc();
    const miniature = doc.collections[0]?.modelTypes[0]?.miniatures[0];
    if (!miniature) {
      throw new Error("fixture miniature missing");
    }
    miniature.statusChangedAt = "2026-01-15T12:00:00Z";
    miniature.statusHistory = [{ status: "PAINTED", changedAt: "2026-01-15T12:00:00Z" }];

    const md = renderMarkdown(doc, "every", { kind: "zone", timeZone: "Europe/London" });

    expect(md).toContain("Status: Painted (15 Jan 2026, 12:00 GMT)");
    expect(md).toContain("Painted · 15 Jan 2026, 12:00 GMT");
    expect(md).not.toContain("2026-01-15T12:00:00Z");
  });

  it("escapes Markdown heading markers in model type names", () => {
    const md = renderMarkdown(makeExportDoc(), "summary", { kind: "iso" });

    expect(md).toContain("## \\# Evil Heading");
    expect(md).not.toMatch(/^## # Evil Heading/m);
  });

  it("labels unnamed miniatures by position within the type", () => {
    const md = renderMarkdown(makeExportDoc(), "every", { kind: "iso" });

    expect(md).toMatch(/#2|# 2|Miniature 2|Unnamed 2/i);
  });
});
