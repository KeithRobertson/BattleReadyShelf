import type { CollectionModel } from "@/generated";

export function normalizeWargearName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Resolved wargear names on this miniature. A two-handed item that shares a linkGroupId across
 * slots is emitted once; two one-handed fills (even with the same name) stay two names.
 *
 * Catalogue option names and custom labels both count. Unassigned slots are omitted, so a default
 * loadout the user has not actually recorded does not inflate inventory counts.
 */
export default function wargearNamesOnModel(model: CollectionModel): string[] {
  const optionNameById = new Map(
    (model.modelDefinition?.wargearOptions ?? []).map((option) => [option.id ?? "", option.name]),
  );

  const names: string[] = [];
  const seenLinkGroups = new Set<string>();
  for (const selection of model.wargearSelections ?? []) {
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
