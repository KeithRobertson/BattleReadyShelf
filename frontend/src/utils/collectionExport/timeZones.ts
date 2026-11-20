import type { TimeDisplay } from "@/utils/collectionExport/formatExportTime";

const RAW_ISO = { value: "iso", label: "Raw ISO" };
const LOCAL = { value: "local", label: "Local" };

export function listTimeZoneOptions(): { value: string; label: string }[] {
  return [RAW_ISO, LOCAL, ...readTimeZoneIds().map((zone) => ({ value: zone, label: zone }))];
}

export function resolveTimeDisplay(includeTimes: boolean, zoneChoice: string): TimeDisplay {
  if (!includeTimes) {
    return { kind: "off" };
  }
  if (zoneChoice === "iso") {
    return { kind: "iso" };
  }
  if (zoneChoice === "local") {
    return { kind: "zone", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC" };
  }
  return { kind: "zone", timeZone: zoneChoice };
}

function readTimeZoneIds(): string[] {
  if (typeof Intl.supportedValuesOf !== "function") {
    return [];
  }
  return [...Intl.supportedValuesOf("timeZone")].sort((a, b) => a.localeCompare(b));
}
