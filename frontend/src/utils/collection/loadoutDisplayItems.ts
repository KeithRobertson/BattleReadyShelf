import type { AttachmentSlot, CollectionModel, WargearOption, WargearSelection } from "@/generated";

export type LoadoutDisplayItem = {
  key: string;
  slotIds: string[];
  slotLabel: string;
  wargearLabel: string | undefined;
  optionName: string | undefined;
  customLabel: string | null | undefined;
  linked: boolean;
  title: string | undefined;
};

function selectionBySlot(model: CollectionModel): Map<string, WargearSelection> {
  return new Map(
    (model.wargearSelections ?? [])
      .filter((selection) => selection.attachmentSlotId)
      .map((selection) => [selection.attachmentSlotId as string, selection]),
  );
}

function wargearLabel(
  selection: WargearSelection | undefined,
  options: WargearOption[],
): { optionName: string | undefined; customLabel: string | null | undefined; display: string | undefined } {
  const optionName = options.find((option) => option.id === selection?.wargearOptionId)?.name;
  const customLabel = selection?.customLabel;
  const trimmedCustom = customLabel?.trim();
  return { optionName, customLabel, display: optionName ?? (trimmedCustom ? trimmedCustom : undefined) };
}

/**
 * Read-only loadout rows. Slots that share a linkGroupId collapse to one two-handed item; two
 * independent fills of the same weapon stay two rows.
 */
export default function loadoutDisplayItems(
  slots: AttachmentSlot[],
  model: CollectionModel,
  options: WargearOption[],
): LoadoutDisplayItem[] {
  const bySlot = selectionBySlot(model);
  const seenGroups = new Set<string>();
  const items: LoadoutDisplayItem[] = [];

  for (const slot of slots) {
    const slotId = slot.id;
    if (!slotId) {
      continue;
    }
    const selection = bySlot.get(slotId);
    const groupId = selection?.linkGroupId;
    if (groupId) {
      if (seenGroups.has(groupId)) {
        continue;
      }
      const partners = slots.filter((candidate) => candidate.id && bySlot.get(candidate.id)?.linkGroupId === groupId);
      if (partners.length >= 2) {
        seenGroups.add(groupId);
        const names = partners.map((partner) => partner.name).filter((name): name is string => Boolean(name));
        const label = wargearLabel(selection, options);
        items.push({
          key: groupId,
          slotIds: partners.map((partner) => partner.id).filter((id): id is string => Boolean(id)),
          slotLabel: names.join(" + "),
          wargearLabel: label.display,
          optionName: label.optionName,
          customLabel: label.customLabel,
          linked: true,
          title: `One item occupying ${names.join(" and ")}`,
        });
        continue;
      }
    }

    const label = wargearLabel(selection, options);
    items.push({
      key: slotId,
      slotIds: [slotId],
      slotLabel: slot.name ?? "Slot",
      wargearLabel: label.display,
      optionName: label.optionName,
      customLabel: label.customLabel,
      linked: false,
      title: label.customLabel ? "Custom..." : undefined,
    });
  }

  return items;
}
