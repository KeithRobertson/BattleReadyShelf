import type { UpsertModelDefinitionDraftRequest } from "@/generated";

/** A slot being edited. `id` is real once the server has seen it, otherwise a client placeholder. */
export interface EditableSlot {
  id: string;
  name: string;
  type: string;
}

/** A wargear option being edited. `wargearDefinitionId` is unset for a hand-typed new name. */
export interface EditableOption {
  id: string;
  wargearDefinitionId?: string;
  name: string;
  isDefault: boolean;
  attachmentSlotIds: string[];
}

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Slot types are free-form strings shared with the imported reference dataset (e.g. "arm", "head"),
 * so a new hand-authored slot starts from a neutral value the author can overwrite.
 */
export const DEFAULT_SLOT_TYPE = "other";

/** The subset of a definition's slots this editor round-trips, shared by drafts and definitions. */
interface SourceSlot {
  id?: string;
  name: string;
  type: string;
}

/** The subset of a definition's options this editor round-trips, shared by drafts and definitions. */
interface SourceOption {
  id?: string;
  wargearDefinitionId?: string;
  name: string;
  isDefault: boolean;
  attachmentSlotIds: string[];
}

export function toEditableSlots(slots: SourceSlot[]): EditableSlot[] {
  return slots.map((slot) => ({ id: slot.id ?? newId(), name: slot.name, type: slot.type }));
}

export function toEditableOptions(options: SourceOption[]): EditableOption[] {
  return options.map((option) => ({
    id: option.id ?? newId(),
    wargearDefinitionId: option.wargearDefinitionId,
    name: option.name,
    isDefault: option.isDefault,
    attachmentSlotIds: option.attachmentSlotIds,
  }));
}

/**
 * Builds the save payload. Admin drafts and a user's own definitions accept the same request body,
 * because both replace the whole definition rather than patching it.
 */
export function toUpsertRequest(
  name: string,
  factionId: string | undefined,
  description: string,
  slots: EditableSlot[],
  options: EditableOption[],
): UpsertModelDefinitionDraftRequest {
  return {
    name,
    faction_id: factionId,
    description: description || undefined,
    attachmentSlots: slots.map((slot) => ({ id: slot.id, name: slot.name, type: slot.type })),
    wargearOptions: options.map((option) => ({
      id: option.id,
      wargearDefinitionId: option.wargearDefinitionId,
      name: option.name,
      isDefault: option.isDefault,
      attachmentSlotIds: option.attachmentSlotIds,
    })),
  };
}
