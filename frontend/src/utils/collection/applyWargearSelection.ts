import type { CollectionModel, WargearSelection } from "@/generated";

export type WargearSlotUpdate = {
  wargearOptionId?: string | null;
  customLabel?: string | null;
  sameAsSlotId?: string | null;
};

function isEmpty(selection: WargearSelection | undefined): boolean {
  return !selection || (!selection.wargearOptionId && !(selection.customLabel ?? "").trim());
}

function selectionsBySlot(model: CollectionModel): Map<string, WargearSelection> {
  return new Map(
    (model.wargearSelections ?? [])
      .filter((selection) => selection.attachmentSlotId)
      .map((selection) => [selection.attachmentSlotId as string, { ...selection }]),
  );
}

function breakGroups(bySlot: Map<string, WargearSelection>, rewrittenSlots: string[]): void {
  const brokenGroups = new Set<string>();
  for (const slotId of rewrittenSlots) {
    const existing = bySlot.get(slotId);
    if (existing?.linkGroupId) {
      brokenGroups.add(existing.linkGroupId);
    }
  }
  if (brokenGroups.size === 0) {
    return;
  }
  for (const [slotId, selection] of bySlot) {
    if (selection.linkGroupId && brokenGroups.has(selection.linkGroupId) && !rewrittenSlots.includes(slotId)) {
      bySlot.set(slotId, { ...selection, linkGroupId: undefined });
    }
  }
}

function writeSlot(
  bySlot: Map<string, WargearSelection>,
  slotId: string,
  patch: Omit<WargearSelection, "attachmentSlotId">,
): void {
  bySlot.set(slotId, { attachmentSlotId: slotId, ...patch });
}

function linkToExisting(bySlot: Map<string, WargearSelection>, slotId: string, sameAsSlotId: string): boolean {
  if (sameAsSlotId === slotId) {
    return false;
  }
  const source = bySlot.get(sameAsSlotId);
  if (!source || isEmpty(source)) {
    return false;
  }

  const current = bySlot.get(slotId);
  const groupId = source.linkGroupId ?? current?.linkGroupId ?? crypto.randomUUID();
  if (current?.linkGroupId && current.linkGroupId !== groupId) {
    breakGroups(bySlot, [slotId]);
  }

  const sourceNow = bySlot.get(sameAsSlotId);
  if (!sourceNow) {
    return false;
  }
  if (!sourceNow.linkGroupId) {
    writeSlot(bySlot, sameAsSlotId, {
      wargearOptionId: sourceNow.wargearOptionId,
      customLabel: sourceNow.customLabel,
      linkGroupId: groupId,
    });
  }

  const linked = bySlot.get(sameAsSlotId);
  if (!linked) {
    return false;
  }
  writeSlot(bySlot, slotId, {
    wargearOptionId: linked.wargearOptionId,
    customLabel: linked.customLabel,
    linkGroupId: linked.linkGroupId ?? groupId,
  });
  return true;
}

/**
 * Replaces the touched slot on a collection model's loadout. A new catalogue option or custom
 * label is a second item in that slot only. sameAsSlotId copies an existing fill and shares its
 * link group so both slots are one physical item.
 */
export default function applyWargearSelection(
  model: CollectionModel,
  attachmentSlotId: string,
  update: WargearSlotUpdate,
): WargearSelection[] {
  const bySlot = selectionsBySlot(model);
  if (update.sameAsSlotId && linkToExisting(bySlot, attachmentSlotId, update.sameAsSlotId)) {
    return [...bySlot.values()];
  }

  breakGroups(bySlot, [attachmentSlotId]);
  const custom = update.customLabel?.trim() || undefined;
  const optionId = update.wargearOptionId || undefined;
  if (custom) {
    writeSlot(bySlot, attachmentSlotId, { customLabel: custom });
  } else if (!optionId) {
    writeSlot(bySlot, attachmentSlotId, {});
  } else {
    writeSlot(bySlot, attachmentSlotId, { wargearOptionId: optionId });
  }
  return [...bySlot.values()];
}
