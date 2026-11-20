import { describe, expect, it } from "vitest";
import { ALL_INCLUDED, makeExportDoc } from "@/utils/collectionExport/exportFixture";
import { renderHtml } from "@/utils/collectionExport/renderHtml";

const emptyThumbs = new Map<string, string>();

describe("renderHtml", () => {
  it("produces a single self-contained HTML document with a style block and no scripts", () => {
    const html = renderHtml(makeExportDoc(), "summary", emptyThumbs);

    expect(html).toMatch(/<!DOCTYPE html>/i);
    expect(html).toMatch(/<style[\s>]/i);
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).toMatch(/BattleReadyShelf/);
    expect(html).toMatch(/2026-11-20/);
  });

  it("HTML-escapes hostile collection names", () => {
    const html = renderHtml(makeExportDoc(), "summary", emptyThumbs);

    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>x</script>");
  });

  it("omits content when the matching included flag is false", () => {
    const html = renderHtml(
      makeExportDoc({
        ...ALL_INCLUDED,
        collectionDescription: false,
        faction: false,
        status: false,
        paintRecipes: false,
        wargear: false,
      }),
      "summary",
      emptyThumbs,
    );

    expect(html).not.toContain("First collection description");
    expect(html).not.toContain("Death Guard");
    expect(html).not.toContain("Painted");
    expect(html).not.toContain("Boltgun");
    expect(html).not.toContain("Death Guard Green");
  });

  it("summary collapses identical loadouts and omits miniature-only fields", () => {
    const html = renderHtml(makeExportDoc(), "summary", emptyThumbs);

    expect(html).toMatch(/2×\s+Boltgun,\s+Plague knife/);
    expect(html).not.toContain("Champion");
    expect(html).not.toContain("Boss guy");
    expect(html).not.toContain("Miniature-only recipe");
  });

  it("every miniature shows names and status history when included", () => {
    const html = renderHtml(makeExportDoc(), "every", emptyThumbs);

    expect(html).toContain("Champion");
    expect(html).toContain("Boss guy");
    expect(html).toContain("2026-10-02T18:30:00Z");
  });

  it("applies hexColour as a style only when it matches #RRGGBB", () => {
    const html = renderHtml(makeExportDoc(), "summary", emptyThumbs);

    expect(html).toMatch(/background(?:-color)?:\s*#848A66/i);
    expect(html).not.toContain("red;background:url(javascript:alert(1))");
    expect(html).not.toMatch(/javascript:/i);
  });

  it("uses data URI thumbnail sources and leaves no http(s) thumbnail URLs", () => {
    const thumbnails = new Map([
      ["https://cdn.example/thumb1.jpg", "data:image/jpeg;base64,abc123"],
    ]);
    const html = renderHtml(makeExportDoc(), "every", thumbnails);

    expect(html).toContain('src="data:image/jpeg;base64,abc123"');
    expect(html).not.toMatch(/src="https?:\/\//);
    expect(html).not.toContain("https://cdn.example/thumb1.jpg");
  });

  it("renders without an image when the thumbnail map has no entry", () => {
    const html = renderHtml(makeExportDoc(), "every", emptyThumbs);

    expect(html).not.toMatch(/<img\b/i);
  });
});
