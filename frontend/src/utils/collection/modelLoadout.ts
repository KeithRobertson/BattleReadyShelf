import type { AttachmentSlot, CollectionModel, ModelDefinition, WargearOption, WargearSelection } from "@/generated";

export function isMagnetized(model: CollectionModel, slotId: string): boolean {
  return (model.magnetizedSlotIds ?? []).includes(slotId);
}

export function filledSelections(model: CollectionModel): WargearSelection[] {
  return (model.wargearSelections ?? []).filter(
    (selection) => Boolean(selection.wargearOptionId) || Boolean(selection.customLabel?.trim()),
  );
}

export function bitsForSlot(model: CollectionModel, slotId: string): WargearSelection[] {
  return filledSelections(model).filter((selection) => selection.attachmentSlotId === slotId);
}

export function isEquippedBit(selection: WargearSelection, filledInSlot: number): boolean {
  if (selection.equipped === true) {
    return true;
  }
  if (selection.equipped === false) {
    return false;
  }
  return filledInSlot === 1;
}

export function equippedSelection(model: CollectionModel, slotId: string): WargearSelection | undefined {
  const bits = bitsForSlot(model, slotId);
  return bits.find((bit) => isEquippedBit(bit, bits.length));
}

export function bitKey(selection: WargearSelection): string {
  if (selection.wargearOptionId) {
    return `opt:${selection.wargearOptionId}`;
  }
  const custom = selection.customLabel?.trim();
  if (custom) {
    return `custom:${custom.toLowerCase()}`;
  }
  return "empty";
}

export function identityDefinitions(model: CollectionModel): ModelDefinition[] {
  const current = model.modelDefinition;
  const alternates = model.alternateModelDefinitions ?? [];
  if (!current) {
    return alternates;
  }
  return [current, ...alternates.filter((definition) => definition.id && definition.id !== current.id)];
}

function normaliseSlotName(name: string | null | undefined): string {
  return name?.trim().toLowerCase() ?? "";
}

function matchingSlotIds(
  definition: ModelDefinition,
  slot: AttachmentSlot,
  currentDefinitionId: string | undefined,
): Set<string> {
  const ids = new Set(
    (definition.attachmentSlots ?? [])
      .filter((candidate) => candidate.id && normaliseSlotName(candidate.name) === normaliseSlotName(slot.name))
      .map((candidate) => candidate.id as string),
  );
  if (definition.id === currentDefinitionId && slot.id) {
    ids.add(slot.id);
  }
  return ids;
}

/** Catalogue options this slot may take, including options from alternate identities with the same slot name. */
export function optionsEligibleForSlot(slot: AttachmentSlot, model: CollectionModel): WargearOption[] {
  const slotId = slot.id;
  if (!slotId) {
    return [];
  }
  const seen = new Set<string>();
  const options: WargearOption[] = [];
  for (const definition of identityDefinitions(model)) {
    const slotIds = matchingSlotIds(definition, slot, model.modelDefinition?.id);
    for (const option of definition.wargearOptions ?? []) {
      const optionId = option.id;
      if (!optionId || seen.has(optionId) || !(option.attachmentSlotIds ?? []).some((id) => slotIds.has(id))) {
        continue;
      }
      seen.add(optionId);
      options.push(option);
    }
  }
  return options;
}

export function allWargearOptions(model: CollectionModel): WargearOption[] {
  const seen = new Set<string>();
  const options: WargearOption[] = [];
  for (const definition of identityDefinitions(model)) {
    for (const option of definition.wargearOptions ?? []) {
      if (option.id && !seen.has(option.id)) {
        seen.add(option.id);
        options.push(option);
      }
    }
  }
  return options;
}

export function selectionLabel(selection: WargearSelection, options: WargearOption[]): string {
  const custom = selection.customLabel?.trim();
  if (custom) {
    return custom;
  }
  return options.find((option) => option.id === selection.wargearOptionId)?.name?.trim() || "Wargear";
}
