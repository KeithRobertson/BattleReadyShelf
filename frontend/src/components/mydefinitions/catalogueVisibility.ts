/** Which rows a "my definitions" page is currently listing. */
export type CatalogueVisibility = "all" | "in-pickers" | "hidden";

export const CATALOGUE_VISIBILITY_OPTIONS: { value: CatalogueVisibility; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-pickers", label: "In pickers" },
  { value: "hidden", label: "Hidden" },
];

export function isHidden(item: { hidden?: boolean }): boolean {
  return item.hidden === true;
}

export function matchesVisibility(item: { hidden?: boolean }, visibility: CatalogueVisibility): boolean {
  if (visibility === "in-pickers") return !isHidden(item);
  if (visibility === "hidden") return isHidden(item);
  return true;
}

export function matchesSearch(name: string, search: string): boolean {
  const term = search.trim().toLowerCase();
  return term === "" || name.toLowerCase().includes(term);
}

/** Flips `hidden` on every item whose id is in the set, leaving the rest untouched. */
export function markHidden<T extends { id?: string }>(
  items: readonly T[],
  ids: ReadonlySet<string>,
  hidden: boolean,
): T[] {
  return items.map((item) => (item.id && ids.has(item.id) ? { ...item, hidden } : item));
}

/**
 * What a "hide/show these" button should do to the rows currently on screen: hide if any of them
 * are still offered, otherwise show them all again. Null when there is nothing to change.
 */
export function bulkHiddenIntent(
  items: readonly { id?: string; hidden?: boolean }[],
): { ids: string[]; hidden: boolean } | null {
  const withIds = items.filter((item): item is { id: string; hidden?: boolean } => Boolean(item.id));
  if (withIds.length === 0) return null;

  const hidden = withIds.some((item) => !isHidden(item));
  const ids = withIds.filter((item) => isHidden(item) !== hidden).map((item) => item.id);
  return ids.length > 0 ? { ids, hidden } : null;
}
