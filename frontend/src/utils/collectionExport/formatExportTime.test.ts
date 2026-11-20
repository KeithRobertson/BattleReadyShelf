import { describe, expect, it } from "vitest";
import { formatExportTime } from "@/utils/collectionExport/formatExportTime";

const ISO = "2026-10-02T18:30:00Z";

describe("formatExportTime", () => {
  it("returns null when time display is off", () => {
    expect(formatExportTime(ISO, { kind: "off" })).toBeNull();
  });

  it("returns the input string when time display is iso", () => {
    expect(formatExportTime(ISO, { kind: "iso" })).toBe(ISO);
  });

  it("formats a winter London instant as GMT", () => {
    expect(
      formatExportTime("2026-01-15T12:00:00Z", { kind: "zone", timeZone: "Europe/London" }),
    ).toBe("15 Jan 2026, 12:00 GMT");
  });

  it("formats a summer London instant as BST", () => {
    expect(
      formatExportTime("2026-07-15T11:00:00Z", { kind: "zone", timeZone: "Europe/London" }),
    ).toBe("15 Jul 2026, 12:00 BST");
  });

  it("returns the raw string when the instant is not a time", () => {
    expect(formatExportTime("not-a-time", { kind: "zone", timeZone: "Europe/London" })).toBe(
      "not-a-time",
    );
  });
});
