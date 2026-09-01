import type { DraftDiff, FieldChange } from "@/utils/modelDefinitionDraftDiff";

/**
 * Builds a diff for a definition whose whole content is a handful of fields - a faction or a piece
 * of wargear - so it can be shown by the same modal that renders a model definition diff. Model
 * definitions additionally compare their attachment slots and wargear options; these have no
 * children, so those sections stay empty and the modal omits them.
 */
export function diffFields(fields: FieldChange[], isNew: boolean): DraftDiff {
  const details = fields.filter((field) => field.before !== field.after);
  return {
    isNew,
    details,
    attachmentSlots: [],
    wargearOptions: [],
    changeCount: details.length,
  };
}

/** A before/after pair, treating an empty or missing value as "not set". */
export function fieldChange(label: string, before: string | null | undefined, after: string | null | undefined) {
  return { label, before: before || null, after: after || null };
}
