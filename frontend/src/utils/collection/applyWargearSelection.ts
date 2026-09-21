import type { CollectionModel, WargearSelection } from "@/generated";
import { bitKey, bitsForSlot, isEquippedBit } from "@/utils/collection/modelLoadout.ts";

export type WargearSlotUpdate = {
  wargearOptionId?: string | null;
  customLabel?: string | null;
  sameAsSlotId?: string | null;
  magnetized?: boolean;
  addBit?: boolean;
  equipKey?: string;
  removeKey?: string;
};

export type LoadoutPatch = {
  wargearSelections: WargearSelection[];
  magnetizedSlotIds: string[];
};

function isEmpty(selection: WargearSelection | undefined): boolean {
  return !selection || (!selection.wargearOptionId && !(selection.customLabel ?? "").trim());
}

function cloneSelection(selection: WargearSelection): WargearSelection {
  return { ...selection };
}

function magnetizedIds(model: CollectionModel): string[] {
  return [...(model.magnetizedSlotIds ?? [])];
}

function allSelections(model: CollectionModel): WargearSelection[] {
  return (model.wargearSelections ?? []).map(cloneSelection);
}

function breakGroups(selections: WargearSelection[], rewrittenSlots: string[]): void {
  const brokenGroups = new Set<string>();
  for (const slotId of rewrittenSlots) {
    const existing = equippedOf(selections, slotId);
    if (existing?.linkGroupId) {
      brokenGroups.add(existing.linkGroupId);
    }
  }
  if (brokenGroups.size === 0) {
    return;
  }
  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    if (
      selection.linkGroupId &&
      brokenGroups.has(selection.linkGroupId) &&
      !rewrittenSlots.includes(selection.attachmentSlotId ?? "")
    ) {
      selections[i] = { ...selection, linkGroupId: undefined };
    }
  }
}

function filledInSlot(selections: WargearSelection[], slotId: string): WargearSelection[] {
  return selections.filter(
    (selection) =>
      selection.attachmentSlotId === slotId &&
      (Boolean(selection.wargearOptionId) || Boolean(selection.customLabel?.trim())),
  );
}

function equippedOf(selections: WargearSelection[], slotId: string): WargearSelection | undefined {
  const filled = filledInSlot(selections, slotId);
  return filled.find((selection) => isEquippedBit(selection, filled.length));
}

function unequipSlot(selections: WargearSelection[], slotId: string): void {
  for (let i = 0; i < selections.length; i++) {
    if (selections[i].attachmentSlotId === slotId) {
      selections[i] = { ...selections[i], equipped: false };
    }
  }
}

function removeSlotSelections(selections: WargearSelection[], slotId: string): WargearSelection[] {
  return selections.filter((selection) => selection.attachmentSlotId !== slotId);
}

function fillPatch(
  wargearOptionId: string | undefined,
  customLabel: string | undefined,
  linkGroupId: string | undefined,
  equipped: boolean,
): Omit<WargearSelection, "attachmentSlotId"> {
  return {
    wargearOptionId,
    customLabel,
    linkGroupId,
    equipped,
  };
}

function writeEquippedSlot(
  selections: WargearSelection[],
  slotId: string,
  patch: Omit<WargearSelection, "attachmentSlotId">,
  replaceSlot: boolean,
): WargearSelection[] {
  const next = replaceSlot ? removeSlotSelections(selections, slotId) : selections.map(cloneSelection);
  if (!replaceSlot) {
    unequipSlot(next, slotId);
  }
  const filled = {
    attachmentSlotId: slotId,
    wargearOptionId: patch.wargearOptionId,
    customLabel: patch.customLabel,
    linkGroupId: patch.linkGroupId,
    equipped: patch.equipped !== false && (!isEmpty(patch as WargearSelection) || Boolean(patch.equipped)),
  };
  if (isEmpty(filled) && !replaceSlot) {
    return next.filter((selection) => selection.attachmentSlotId !== slotId || !isEmpty(selection));
  }
  if (isEmpty(filled)) {
    return next;
  }
  const existingIndex = next.findIndex(
    (selection) => selection.attachmentSlotId === slotId && bitKey(selection) === bitKey(filled),
  );
  if (existingIndex >= 0) {
    next[existingIndex] = { ...next[existingIndex], ...filled, equipped: true };
    return next;
  }
  next.push(filled);
  return next;
}

function linkToExisting(
  selections: WargearSelection[],
  slotId: string,
  sameAsSlotId: string,
  replaceSlot: boolean,
): WargearSelection[] | undefined {
  if (sameAsSlotId === slotId) {
    return undefined;
  }
  const source = equippedOf(selections, sameAsSlotId);
  if (!source || isEmpty(source)) {
    return undefined;
  }

  const current = equippedOf(selections, slotId);
  const groupId = source.linkGroupId ?? current?.linkGroupId ?? crypto.randomUUID();
  if (current?.linkGroupId && current.linkGroupId !== groupId) {
    breakGroups(selections, [slotId]);
  }

  const sourceNow = equippedOf(selections, sameAsSlotId);
  if (!sourceNow) {
    return undefined;
  }
  if (!sourceNow.linkGroupId) {
    const sourceIndex = selections.findIndex(
      (selection) => selection.attachmentSlotId === sameAsSlotId && bitKey(selection) === bitKey(sourceNow),
    );
    if (sourceIndex >= 0) {
      selections[sourceIndex] = { ...sourceNow, linkGroupId: groupId };
    }
  }

  const linked = equippedOf(selections, sameAsSlotId);
  if (!linked) {
    return undefined;
  }
  return writeEquippedSlot(
    selections,
    slotId,
    fillPatch(linked.wargearOptionId, linked.customLabel, linked.linkGroupId ?? groupId, true),
    replaceSlot,
  );
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
  return applyLoadoutChange(model, attachmentSlotId, update).wargearSelections;
}

function nextMagnetizedSlotIds(model: CollectionModel, slotId: string, magnetized: boolean | undefined): string[] {
  const ids = magnetizedIds(model);
  if (magnetized === true && !ids.includes(slotId)) {
    return [...ids, slotId];
  }
  if (magnetized === false) {
    return ids.filter((id) => id !== slotId);
  }
  return ids;
}

function isBitMutation(update: WargearSlotUpdate): boolean {
  return (
    update.wargearOptionId !== undefined ||
    update.customLabel !== undefined ||
    Boolean(update.sameAsSlotId) ||
    Boolean(update.equipKey) ||
    Boolean(update.removeKey) ||
    update.addBit === true
  );
}

function keepEquippedOnly(selections: WargearSelection[], slotId: string): WargearSelection[] {
  const equipped = equippedOf(selections, slotId);
  const withoutSlot = removeSlotSelections(selections, slotId);
  if (equipped && !isEmpty(equipped)) {
    withoutSlot.push({ ...equipped, linkGroupId: undefined, equipped: true });
  }
  return withoutSlot;
}

function removeBit(selections: WargearSelection[], slotId: string, key: string): WargearSelection[] {
  const remaining = selections.filter(
    (selection) => !(selection.attachmentSlotId === slotId && bitKey(selection) === key),
  );
  const still = filledInSlot(remaining, slotId);
  if (still.length === 1 && still[0].equipped !== true) {
    const index = remaining.indexOf(still[0]);
    if (index >= 0) {
      remaining[index] = { ...still[0], equipped: true };
    }
  }
  return remaining;
}

function equipBit(
  model: CollectionModel,
  selections: WargearSelection[],
  slotId: string,
  key: string,
): WargearSelection[] {
  const bits = bitsForSlot({ ...model, wargearSelections: selections }, slotId);
  if (!bits.some((bit) => bitKey(bit) === key)) {
    return selections;
  }
  breakGroups(selections, [slotId]);
  return selections.map((selection) =>
    selection.attachmentSlotId === slotId
      ? { ...selection, equipped: bitKey(selection) === key, linkGroupId: undefined }
      : selection,
  );
}

function assignFill(
  selections: WargearSelection[],
  slotId: string,
  update: WargearSlotUpdate,
  replaceSlot: boolean,
  magnetized: boolean,
): WargearSelection[] {
  if (update.sameAsSlotId) {
    const linked = linkToExisting(selections, slotId, update.sameAsSlotId, replaceSlot);
    if (linked) {
      return linked;
    }
  }
  breakGroups(selections, [slotId]);
  const custom = update.customLabel?.trim() || undefined;
  const optionId = update.wargearOptionId || undefined;
  if (custom) {
    return writeEquippedSlot(selections, slotId, fillPatch(undefined, custom, undefined, true), replaceSlot);
  }
  if (!optionId) {
    if (magnetized) {
      unequipSlot(selections, slotId);
      return selections;
    }
    return removeSlotSelections(selections, slotId);
  }
  return writeEquippedSlot(selections, slotId, fillPatch(optionId, undefined, undefined, true), replaceSlot);
}

export function applyLoadoutChange(
  model: CollectionModel,
  attachmentSlotId: string,
  update: WargearSlotUpdate,
): LoadoutPatch {
  const magnetizedSlotIds = nextMagnetizedSlotIds(model, attachmentSlotId, update.magnetized);
  const magnetized = magnetizedSlotIds.includes(attachmentSlotId);
  const selections = allSelections(model);
  const bitMutation = isBitMutation(update);

  if (update.magnetized === false && !bitMutation) {
    return { wargearSelections: keepEquippedOnly(selections, attachmentSlotId), magnetizedSlotIds };
  }
  if (update.magnetized !== undefined && !bitMutation) {
    return { wargearSelections: selections, magnetizedSlotIds };
  }
  if (update.removeKey) {
    return { wargearSelections: removeBit(selections, attachmentSlotId, update.removeKey), magnetizedSlotIds };
  }
  if (update.equipKey) {
    return { wargearSelections: equipBit(model, selections, attachmentSlotId, update.equipKey), magnetizedSlotIds };
  }

  const replaceSlot = !magnetized || update.addBit !== true;
  return {
    wargearSelections: assignFill(selections, attachmentSlotId, update, replaceSlot, magnetized),
    magnetizedSlotIds,
  };
}
