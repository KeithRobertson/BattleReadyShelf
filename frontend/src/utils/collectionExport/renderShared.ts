import type {
  CollectionExportInclude,
  CollectionExportLoadoutEntry,
  CollectionExportPaint,
  CollectionExportPaintRecipe,
  CollectionModelStatus,
} from "@/generated";
import {
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUSES,
} from "@/utils/collectionModelStatus";

export const HEX_COLOUR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColour(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_COLOUR_PATTERN.test(value);
}

export function isIncluded(
  included: CollectionExportInclude,
  flag: keyof CollectionExportInclude,
): boolean {
  return included[flag] === true;
}

export function formatStatusLabel(status: string): string {
  if ((COLLECTION_MODEL_STATUSES as string[]).includes(status)) {
    return COLLECTION_MODEL_STATUS_LABELS[status as CollectionModelStatus];
  }
  return status;
}

/** "Painted: 30, Primed: 12" — pipeline order when known. */
export function formatStatusCounts(counts: Record<string, number> | undefined): string | null {
  if (!counts) {
    return null;
  }
  const known = COLLECTION_MODEL_STATUSES.filter((status) => counts[status] !== undefined).map(
    (status) => `${COLLECTION_MODEL_STATUS_LABELS[status]}: ${counts[status]}`,
  );
  const knownSet = new Set<string>(COLLECTION_MODEL_STATUSES);
  const rest = Object.keys(counts)
    .filter((status) => !knownSet.has(status))
    .sort()
    .map((status) => `${status}: ${counts[status]}`);
  const parts = [...known, ...rest];
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Compact "Boltgun, Plague knife" label for a loadout. */
export function formatLoadoutItems(loadout: CollectionExportLoadoutEntry[]): string {
  return loadout
    .map((entry) => {
      const sparesLabel = entry.spares?.length ? entry.spares.join(", ") : null;
      if (entry.wargear && sparesLabel) {
        return `${entry.wargear} (spares: ${sparesLabel})`;
      }
      if (entry.wargear) {
        return entry.wargear;
      }
      if (sparesLabel) {
        return `spares: ${sparesLabel}`;
      }
      return null;
    })
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

export function formatLoadoutGroupLine(count: number, loadout: CollectionExportLoadoutEntry[]): string {
  const items = formatLoadoutItems(loadout);
  return items ? `${count}× ${items}` : `${count}× (empty loadout)`;
}

export function miniaturePositionLabel(index: number): string {
  return `Miniature ${index + 1}`;
}

export function formatPaintLine(paint: CollectionExportPaint): string {
  const bits: string[] = [];
  if (paint.step) {
    bits.push(`${paint.step}:`);
  }
  bits.push(paint.name);
  if (paint.brand) {
    bits.push(`(${paint.brand})`);
  }
  if (paint.note) {
    bits.push(`— ${paint.note}`);
  }
  return bits.join(" ");
}

export function paintRecipeHasContent(
  recipe: CollectionExportPaintRecipe | null | undefined,
): recipe is CollectionExportPaintRecipe {
  return Boolean(recipe && ((recipe.notes && recipe.notes.length > 0) || recipe.paints.length > 0));
}

export function footerLine(exportedAt: string): string {
  return `Exported from BattleReadyShelf on ${exportedAt}`;
}
