import { describe, expect, it } from "vitest";
import { exportFileName } from "@/utils/collectionExport/exportFileName";

const date = new Date("2026-11-20T12:00:00Z");

describe("exportFileName", () => {
  it("uses a slug of the collection name for a single collection", () => {
    expect(exportFileName([{ name: "Death Guard" }], "json", date)).toBe("death-guard-2026-11-20.json");
  });

  it("uses collections prefix when exporting several", () => {
    expect(exportFileName([{ name: "Death Guard" }, { name: "Orks" }], "markdown", date)).toBe(
      "collections-2026-11-20.md",
    );
  });

  it("falls back to collection when the name has no usable characters", () => {
    expect(exportFileName([{ name: "!!!" }], "html", date)).toBe("collection-2026-11-20.html");
  });
});
