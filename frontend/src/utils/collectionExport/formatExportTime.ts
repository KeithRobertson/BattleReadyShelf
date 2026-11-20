export type TimeDisplay = { kind: "off" } | { kind: "iso" } | { kind: "zone"; timeZone: string };

const NARROW_NO_BREAK_SPACE = "\u202F";

/**
 * `off` hides the time. `iso` keeps the raw instant. `zone` formats it for display.
 * Intl output is normalised so a narrow no-break space becomes a normal space and a
 * single " at " between the date and the time is removed.
 */
export function formatExportTime(iso: string, display: TimeDisplay): string | null {
  if (display.kind === "off") {
    return null;
  }
  if (display.kind === "iso") {
    return iso;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: display.timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(date);

  return formatted.replaceAll(NARROW_NO_BREAK_SPACE, " ").replace(" at ", " ");
}
