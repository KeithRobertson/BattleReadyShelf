type NamedSlot = Readonly<{ id?: string; name?: string }>;
type DefaultableOption = Readonly<{ isDefault?: boolean; attachmentSlotIds?: string[] }>;

/** Slot names that more than one default option is eligible for. Empty means the default loadout is unambiguous. */
export default function slotsWithMultipleDefaults(slots: readonly NamedSlot[], options: readonly DefaultableOption[]): string[] {
  return slots.flatMap((slot) => {
    const slotId = slot.id;
    if (!slotId) {
      return [];
    }
    const defaults = options.filter((option) => option.isDefault && (option.attachmentSlotIds ?? []).includes(slotId));
    return defaults.length > 1 ? [slot.name?.trim() || "(unnamed slot)"] : [];
  });
}
