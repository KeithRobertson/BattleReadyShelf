import { afterEach, describe, expect, it, vi } from "vitest";
import { listTimeZoneOptions, resolveTimeDisplay } from "@/utils/collectionExport/timeZones";

describe("listTimeZoneOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists raw ISO, then local, then sorted zone ids", () => {
    vi.spyOn(Intl, "supportedValuesOf").mockReturnValue([
      "Pacific/Auckland",
      "America/New_York",
      "Europe/London",
    ]);

    expect(listTimeZoneOptions()).toEqual([
      { value: "iso", label: "Raw ISO" },
      { value: "local", label: "Local" },
      { value: "America/New_York", label: "America/New_York" },
      { value: "Europe/London", label: "Europe/London" },
      { value: "Pacific/Auckland", label: "Pacific/Auckland" },
    ]);
  });

  it("lists only raw ISO and local when supportedValuesOf is missing", () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "supportedValuesOf");
    Object.defineProperty(Intl, "supportedValuesOf", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      expect(listTimeZoneOptions()).toEqual([
        { value: "iso", label: "Raw ISO" },
        { value: "local", label: "Local" },
      ]);
    } finally {
      if (descriptor) {
        Object.defineProperty(Intl, "supportedValuesOf", descriptor);
      }
    }
  });
});

describe("resolveTimeDisplay", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is off when times are excluded", () => {
    expect(resolveTimeDisplay(false, "Europe/London")).toEqual({ kind: "off" });
  });

  it("keeps the raw instant when Raw ISO is chosen", () => {
    expect(resolveTimeDisplay(true, "iso")).toEqual({ kind: "iso" });
  });

  it("uses a chosen zone id", () => {
    expect(resolveTimeDisplay(true, "Europe/London")).toEqual({
      kind: "zone",
      timeZone: "Europe/London",
    });
  });

  it("resolves local to the runtime zone at call time", () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      locale: "en-GB",
      calendar: "gregory",
      numberingSystem: "latn",
      timeZone: "Pacific/Auckland",
    });

    expect(resolveTimeDisplay(true, "local")).toEqual({
      kind: "zone",
      timeZone: "Pacific/Auckland",
    });
  });
});
