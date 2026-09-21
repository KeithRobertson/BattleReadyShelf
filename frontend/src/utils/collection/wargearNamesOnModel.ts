import type { CollectionModel } from "@/generated";
import { allWargearOptions, filledSelections } from "@/utils/collection/modelLoadout.ts";

export function normalizeWargearName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Owned wargear names on this miniature, including unequipped magnetised bits. A two-handed item
 * that shares a linkGroupId across slots is emitted once; two one-handed fills (even with the same
 * name) stay two names. Alternate-identity options resolve from those definitions' catalogues.
 */
export default function wargearNamesOnModel(model: CollectionModel): string[] {
  const optionNameById = new Map(allWargearOptions(model).map((option) => [option.id ?? "", option.name]));

  const names: string[] = [];
  const seenLinkGroups = new Set<string>();
  for (const selection of filledSelections(model)) {
    const optionName = selection.wargearOptionId ? optionNameById.get(selection.wargearOptionId) : undefined;
    const label = (optionName ?? selection.customLabel)?.trim();
    if (!label) {
      continue;
    }
    if (selection.linkGroupId) {
      if (seenLinkGroups.has(selection.linkGroupId)) {
        continue;
      }
      seenLinkGroups.add(selection.linkGroupId);
    }
    names.push(label);
  }
  return names;
}
