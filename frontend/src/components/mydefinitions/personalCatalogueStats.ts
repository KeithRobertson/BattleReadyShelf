import { isHidden } from "@/components/mydefinitions/catalogueVisibility";
import type { CountItem } from "@/utils/admin/catalogueStats";

export function countMineOrigins<T>(mine: readonly T[], baseIdOf: (item: T) => string | null | undefined): CountItem[] {
  let customised = 0;
  for (const item of mine) {
    if (baseIdOf(item)) customised += 1;
  }
  return [
    { key: "own", label: "Your own", count: mine.length - customised },
    { key: "customised", label: "Customised", count: customised },
  ];
}

/**
 * Hidden vs still offered across the two lists the page shows: what you own, plus shared rows you
 * have not forked yet. Search and the visibility filter stay off this, so the aside describes the
 * catalogue rather than the current table.
 */
export function countPickerVisibility<T extends { hidden?: boolean }>(
  mine: readonly T[],
  uncustomisedShared: readonly T[],
): CountItem[] {
  const items = [...mine, ...uncustomisedShared];
  let hidden = 0;
  for (const item of items) {
    if (isHidden(item)) hidden += 1;
  }
  return [
    { key: "offered", label: "In pickers", count: items.length - hidden },
    { key: "hidden", label: "Hidden", count: hidden },
  ];
}
