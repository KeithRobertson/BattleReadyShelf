import { paintTypeLabel } from "@/components/mydefinitions/PaintFormModal.tsx";
import type { Faction, Paint, UserDto, UserRole } from "@/generated";
import type { DraftDiff } from "@/utils/modelDefinitionDraftDiff";

export type CountItem = { key: string; label: string; count: number };

export const USER_ROLES: UserRole[] = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

const NONE_KEY = "__none__";

export function countByLabel<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  labelOf: (item: T, key: string) => string,
): CountItem[] {
  const used = new Map<string, CountItem>();
  for (const item of items) {
    const key = keyOf(item);
    const existing = used.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      used.set(key, { key, label: labelOf(item, key), count: 1 });
    }
  }
  return [...used.values()].toSorted((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export function countUsersByRole(users: readonly Pick<UserDto, "role">[]): CountItem[] {
  const counts = new Map<UserRole, number>(USER_ROLES.map((role) => [role, 0]));
  for (const user of users) {
    if (user.role) {
      counts.set(user.role, (counts.get(user.role) ?? 0) + 1);
    }
  }
  return USER_ROLES.map((role) => ({ key: role, label: role, count: counts.get(role) ?? 0 }));
}

export function countFactionParents(factions: readonly Pick<Faction, "parentFactionId">[]): CountItem[] {
  let nested = 0;
  for (const faction of factions) {
    if (faction.parentFactionId) nested += 1;
  }
  return [
    { key: "top", label: "Top-level", count: factions.length - nested },
    { key: "nested", label: "Nested", count: nested },
  ];
}

export function countByFaction<T extends { factionId?: string }>(
  items: readonly T[],
  factionsById: Map<string, Pick<Faction, "name">>,
  uncategorisedLabel = "Uncategorised",
): CountItem[] {
  return countByLabel(
    items,
    (item) => item.factionId ?? NONE_KEY,
    (_, key) => {
      if (key === NONE_KEY) return uncategorisedLabel;
      return factionsById.get(key)?.name ?? key;
    },
  );
}

export function countDraftStatuses(diffs: Iterable<DraftDiff | undefined>): CountItem[] {
  let isNew = 0;
  let unchanged = 0;
  let changed = 0;
  for (const diff of diffs) {
    if (!diff) continue;
    if (diff.isNew) isNew += 1;
    else if (diff.changeCount === 0) unchanged += 1;
    else changed += 1;
  }
  return [
    { key: "new", label: "New", count: isNew },
    { key: "changed", label: "With changes", count: changed },
    { key: "unchanged", label: "No changes", count: unchanged },
  ].filter((item) => item.count > 0);
}

export function unusedCount(items: readonly { usageCount?: number }[]): number {
  return items.filter((item) => (item.usageCount ?? 0) === 0).length;
}

/** Names that more than one definition shares — a hint that two rows should probably be one. */
export function duplicateNames(definitions: readonly { name: string }[]): string[] {
  const counts = new Map<string, number>();
  for (const definition of definitions) {
    const key = definition.name.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const seen = new Set<string>();
  const names: string[] = [];
  for (const definition of definitions) {
    const key = definition.name.toLowerCase();
    if ((counts.get(key) ?? 0) > 1 && !seen.has(key)) {
      seen.add(key);
      names.push(definition.name);
    }
  }
  return names;
}

export function paintBrandCounts(paints: readonly Paint[]): CountItem[] {
  return countByLabel(
    paints,
    (paint) => paint.brand?.trim() || NONE_KEY,
    (paint, key) => (key === NONE_KEY ? "No brand" : (paint.brand?.trim() ?? "No brand")),
  );
}

export function paintTypeCounts(paints: readonly Paint[]): CountItem[] {
  return countByLabel(
    paints,
    (paint) => paint.paintType ?? NONE_KEY,
    (paint, key) => (key === NONE_KEY ? "No type" : (paintTypeLabel(paint.paintType) ?? "No type")),
  );
}
