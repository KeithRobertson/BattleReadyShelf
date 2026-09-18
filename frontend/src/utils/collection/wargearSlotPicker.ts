import type { ComboboxData } from "@mantine/core";
import type { AttachmentSlot, CollectionModel, WargearOption, WargearSelection } from "@/generated";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";

export const CUSTOM_WARGEAR_VALUE = "__custom__";

const SAME_PREFIX = "same:";
const NEW_PREFIX = "new:";

export function sameAsValue(slotId: string): string {
  return `${SAME_PREFIX}${slotId}`;
}

export function newOptionValue(optionId: string): string {
  return `${NEW_PREFIX}${optionId}`;
}

function isFilled(selection: WargearSelection | undefined): boolean {
  return Boolean(selection && (selection.wargearOptionId || (selection.customLabel ?? "").trim()));
}

function selectionsBySlot(model: CollectionModel): Map<string, WargearSelection> {
  return new Map(
    (model.wargearSelections ?? [])
      .filter((selection) => selection.attachmentSlotId)
      .map((selection) => [selection.attachmentSlotId as string, selection]),
  );
}

function selectionLabel(selection: WargearSelection, options: WargearOption[]): string {
  const custom = selection.customLabel?.trim();
  if (custom) {
    return custom;
  }
  return options.find((option) => option.id === selection.wargearOptionId)?.name?.trim() || "Wargear";
}

function representativeSlotId(
  groupId: string,
  slotOrder: string[],
  bySlot: Map<string, WargearSelection>,
): string | undefined {
  return slotOrder.find((id) => bySlot.get(id)?.linkGroupId === groupId);
}

export function wargearPickerValue(slotId: string, slotOrder: string[], model: CollectionModel): string | null {
  const bySlot = selectionsBySlot(model);
  const selection = bySlot.get(slotId);
  if (!selection || !isFilled(selection)) {
    return null;
  }
  if (selection.linkGroupId) {
    const representative = representativeSlotId(selection.linkGroupId, slotOrder, bySlot);
    if (representative && representative !== slotId) {
      return sameAsValue(representative);
    }
  }
  if ((selection.customLabel ?? "").trim()) {
    return CUSTOM_WARGEAR_VALUE;
  }
  return selection.wargearOptionId ? newOptionValue(selection.wargearOptionId) : null;
}

export function wargearPickerData(
  slotId: string,
  slots: AttachmentSlot[],
  options: WargearOption[],
  model: CollectionModel,
): ComboboxData {
  const bySlot = selectionsBySlot(model);
  const sameAsItems = slots
    .filter((slot) => slot.id && slot.id !== slotId && isFilled(bySlot.get(slot.id)))
    .map((slot) => ({
      value: sameAsValue(slot.id ?? ""),
      label: `Same as ${slot.name || "slot"} (${selectionLabel(bySlot.get(slot.id ?? "") as WargearSelection, options)})`,
    }));
  const newItems = [
    ...options
      .filter((option) => option.attachmentSlotIds?.includes(slotId))
      .map((option) => ({
        value: newOptionValue(option.id ?? ""),
        label: option.name ?? "",
      })),
    { value: CUSTOM_WARGEAR_VALUE, label: "Custom..." },
  ];
  if (sameAsItems.length === 0) {
    return newItems;
  }
  return [
    { group: "On this model", items: sameAsItems },
    { group: "New", items: newItems },
  ];
}

export function pickerValueToUpdate(value: string | null): WargearSlotUpdate | "custom" {
  if (value == null) {
    return { wargearOptionId: null, customLabel: null };
  }
  if (value === CUSTOM_WARGEAR_VALUE) {
    return "custom";
  }
  if (value.startsWith(SAME_PREFIX)) {
    return { sameAsSlotId: value.slice(SAME_PREFIX.length) };
  }
  if (value.startsWith(NEW_PREFIX)) {
    return { wargearOptionId: value.slice(NEW_PREFIX.length), customLabel: null };
  }
  return { wargearOptionId: value, customLabel: null };
}

export function linkedPartnerTitle(
  slotId: string,
  slots: AttachmentSlot[],
  model: CollectionModel,
): string | undefined {
  const selection = model.wargearSelections?.find((candidate) => candidate.attachmentSlotId === slotId);
  if (!selection?.linkGroupId) {
    return undefined;
  }
  const others = (model.wargearSelections ?? [])
    .filter((candidate) => candidate.linkGroupId === selection.linkGroupId && candidate.attachmentSlotId !== slotId)
    .map((candidate) => slots.find((slot) => slot.id === candidate.attachmentSlotId)?.name)
    .filter((name): name is string => Boolean(name));
  return others.length > 0 ? `Also ${others.join(", ")}` : undefined;
}
