import type { AttachmentSlot, CollectionModel, WargearOption, WargearSelection } from "@/generated";
import { bitsForSlot, equippedSelection, isMagnetized } from "@/utils/collection/modelLoadout.ts";

export type LoadoutDisplayItem = {
  key: string;
  slotIds: string[];
  slotLabel: string;
  wargearLabel: string | undefined;
  optionName: string | undefined;
  customLabel: string | null | undefined;
  linked: boolean;
  magnetized: boolean;
  extraBitCount: number;
  title: string | undefined;
};

function wargearLabel(
  selection: WargearSelection | undefined,
  options: WargearOption[],
): { optionName: string | undefined; customLabel: string | null | undefined; display: string | undefined } {
  const optionName = options.find((option) => option.id === selection?.wargearOptionId)?.name;
  const customLabel = selection?.customLabel;
  const trimmedCustom = customLabel?.trim();
  return { optionName, customLabel, display: optionName ?? (trimmedCustom ? trimmedCustom : undefined) };
}

function bitNames(model: CollectionModel, slotId: string, options: WargearOption[]): string[] {
  const names: string[] = [];
  for (const bit of bitsForSlot(model, slotId)) {
    const label = wargearLabel(bit, options).display;
    if (label) {
      names.push(label);
    }
  }
  return names;
}

function extraBitsOnSlot(model: CollectionModel, slotId: string, equipped: boolean): number {
  return Math.max(0, bitsForSlot(model, slotId).length - (equipped ? 1 : 0));
}

function unlinkedTitle(
  magnetized: boolean,
  owned: string[],
  customLabel: string | null | undefined,
): string | undefined {
  if (magnetized) {
    return `Magnetised: ${owned.join(", ") || "no bits yet"}`;
  }
  return customLabel ? "Custom..." : undefined;
}

function linkedItem(
  groupId: string,
  partners: AttachmentSlot[],
  selection: WargearSelection | undefined,
  model: CollectionModel,
  options: WargearOption[],
  representativeSlotId: string,
): LoadoutDisplayItem {
  const names = partners.map((partner) => partner.name).filter((name): name is string => Boolean(name));
  const label = wargearLabel(selection, options);
  const extraBitCount = partners.reduce((sum, partner) => sum + extraBitsOnSlot(model, partner.id ?? "", true), 0);
  const magnetized = partners.some((partner) => isMagnetized(model, partner.id ?? ""));
  const occupied = `One item occupying ${names.join(" and ")}`;
  return {
    key: groupId,
    slotIds: partners.map((partner) => partner.id).filter((id): id is string => Boolean(id)),
    slotLabel: names.join(" + "),
    wargearLabel: label.display,
    optionName: label.optionName,
    customLabel: label.customLabel,
    linked: true,
    magnetized,
    extraBitCount,
    title: magnetized
      ? `${occupied}. Also ${bitNames(model, representativeSlotId, options).join(", ") || "magnetised"}`
      : occupied,
  };
}

/**
 * Read-only loadout rows for the equipped build. Slots that share a linkGroupId collapse to one
 * two-handed item; two independent fills of the same weapon stay two rows. Magnetised slots still
 * show the equipped bit, with extra owned bits noted on the chip.
 */
export default function loadoutDisplayItems(
  slots: AttachmentSlot[],
  model: CollectionModel,
  options: WargearOption[],
): LoadoutDisplayItem[] {
  const seenGroups = new Set<string>();
  const items: LoadoutDisplayItem[] = [];

  for (const slot of slots) {
    const slotId = slot.id;
    if (!slotId) {
      continue;
    }
    const selection = equippedSelection(model, slotId);
    const groupId = selection?.linkGroupId;
    if (groupId) {
      if (seenGroups.has(groupId)) {
        continue;
      }
      const partners = slots.filter(
        (candidate) => candidate.id && equippedSelection(model, candidate.id)?.linkGroupId === groupId,
      );
      if (partners.length >= 2) {
        seenGroups.add(groupId);
        items.push(linkedItem(groupId, partners, selection, model, options, slotId));
        continue;
      }
    }

    const label = wargearLabel(selection, options);
    const magnetized = isMagnetized(model, slotId);
    items.push({
      key: slotId,
      slotIds: [slotId],
      slotLabel: slot.name ?? "Slot",
      wargearLabel: label.display,
      optionName: label.optionName,
      customLabel: label.customLabel,
      linked: false,
      magnetized,
      extraBitCount: extraBitsOnSlot(model, slotId, Boolean(selection)),
      title: unlinkedTitle(magnetized, bitNames(model, slotId, options), label.customLabel),
    });
  }

  return items;
}
