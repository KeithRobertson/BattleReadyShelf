import defaultOccupancySlotIds, { type DefaultableOption } from "@/utils/modeldefinitions/defaultOccupancySlotIds.ts";

type NamedSlot = Readonly<{ id?: string; name?: string }>;

/** Slot names that more than one default option is eligible for. Empty means the default loadout is unambiguous. */
export default function slotsWithMultipleDefaults(
  slots: readonly NamedSlot[],
  options: readonly DefaultableOption[],
): string[] {
  return slots.flatMap((slot) => {
    const slotId = slot.id;
    if (!slotId) {
      return [];
    }
    const defaults = options.filter((option) => defaultOccupancySlotIds(option).includes(slotId));
    return defaults.length > 1 ? [slot.name?.trim() || "(unnamed slot)"] : [];
  });
}
