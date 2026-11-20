import type { CollectionExportLoadoutEntry, CollectionExportModelType } from "@/generated";

export type LoadoutGroup = {
  count: number;
  loadout: CollectionExportLoadoutEntry[];
};

function loadoutKey(loadout: CollectionExportLoadoutEntry[] | undefined): string {
  const normalised = (loadout ?? []).map((entry) => ({
    slots: [...entry.slots].sort(),
    wargear: entry.wargear ?? null,
    custom: entry.custom,
    spares: [...(entry.spares ?? [])].sort(),
  }));
  return JSON.stringify(normalised);
}

/** Groups a model type's miniatures by identical loadout (first-occurrence order). */
export function summariseModelType(type: CollectionExportModelType): { loadoutGroups: LoadoutGroup[] } {
  const groups: LoadoutGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const miniature of type.miniatures) {
    const loadout = miniature.loadout ?? [];
    const key = loadoutKey(loadout);
    const existing = indexByKey.get(key);
    if (existing === undefined) {
      indexByKey.set(key, groups.length);
      groups.push({ count: 1, loadout });
    } else {
      const group = groups[existing];
      if (group) {
        group.count += 1;
      }
    }
  }

  return { loadoutGroups: groups };
}
