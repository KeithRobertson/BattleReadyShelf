export type DefaultableOption = Readonly<{
  isDefault?: boolean;
  attachmentSlotIds?: string[];
  defaultAttachmentSlotIds?: string[];
}>;

/**
 * Slots this option occupies in the default loadout. Unspecified defaults still mean every
 * eligible slot, which is what older catalogue rows described.
 */
export default function defaultOccupancySlotIds(option: DefaultableOption): string[] {
  if (!option.isDefault) {
    return [];
  }
  const eligible = option.attachmentSlotIds ?? [];
  const specified = option.defaultAttachmentSlotIds ?? [];
  if (specified.length === 0) {
    return eligible;
  }
  return specified.filter((slotId) => eligible.includes(slotId));
}
