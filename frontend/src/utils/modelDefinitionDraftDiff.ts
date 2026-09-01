import type {
  AttachmentSlot,
  AttachmentSlotDraft,
  Faction,
  ModelDefinition,
  ModelDefinitionDraft,
  WargearOption,
  WargearOptionDraft,
} from "@/generated";

export type ChangeKind = "added" | "removed" | "changed";

/** A single before/after pair, where null means "not set" / "did not exist". */
export interface FieldChange {
  label: string;
  before: string | null;
  after: string | null;
}

/** A change to one attachment slot or wargear option. `fields` is only populated for "changed". */
export interface ChildChange {
  key: string;
  kind: ChangeKind;
  label: string;
  fields: FieldChange[];
}

export interface DraftDiff {
  /** True when the draft is a brand-new definition with no published counterpart. */
  isNew: boolean;
  details: FieldChange[];
  attachmentSlots: ChildChange[];
  wargearOptions: ChildChange[];
  changeCount: number;
}

const KIND_ORDER: Record<ChangeKind, number> = { changed: 0, added: 1, removed: 2 };

function blankToNull(value: string | null | undefined): string | null {
  return value == null || value.trim() === "" ? null : value;
}

function factionName(factionId: string | undefined, factionsById: Map<string, Faction>): string | null {
  if (!factionId) return null;
  return factionsById.get(factionId)?.name ?? factionId;
}

function fieldChange(label: string, before: string | null, after: string | null): FieldChange | null {
  return before === after ? null : { label, before, after };
}

function isFieldChange(change: FieldChange | null): change is FieldChange {
  return change !== null;
}

/**
 * Renders an option's slot references as a human-readable label. Draft options reference draft slot
 * ids and published options reference published slot ids, so both sides are resolved to names.
 */
function slotLabel(slotIds: string[] | undefined, namesById: Map<string, string>): string | null {
  const names = (slotIds ?? []).map((id) => namesById.get(id) ?? id).sort((a, b) => a.localeCompare(b));
  return names.length > 0 ? names.join(", ") : null;
}

function sortChanges(changes: ChildChange[]): ChildChange[] {
  return [...changes].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.localeCompare(b.label));
}

/** The fields every draft and published child row shares, which is all the generic matcher needs. */
interface NamedChild {
  readonly id?: string;
  name: string;
}

/**
 * Matches draft children against the published rows they were started from and classifies each as
 * added, changed or removed. Attachment slots and wargear options only differ in how a draft row
 * points back at its published row and in which fields are worth comparing.
 */
function diffChildren<D extends NamedChild, P extends NamedChild>(
  draftChildren: D[],
  publishedChildren: P[],
  publishedIdOf: (child: D) => string | undefined,
  compareFields: (previous: P, current: D) => FieldChange[],
): ChildChange[] {
  const publishedById = new Map(publishedChildren.map((child) => [child.id ?? "", child]));
  const matchedPublishedIds = new Set<string>();
  const changes: ChildChange[] = [];

  for (const child of draftChildren) {
    const publishedId = publishedIdOf(child);
    const previous = publishedId ? publishedById.get(publishedId) : undefined;
    if (!previous) {
      changes.push({ key: child.id ?? child.name, kind: "added", label: child.name, fields: [] });
      continue;
    }

    matchedPublishedIds.add(previous.id ?? "");
    const fields = compareFields(previous, child);
    if (fields.length > 0) {
      changes.push({ key: child.id ?? child.name, kind: "changed", label: previous.name, fields });
    }
  }

  for (const child of publishedChildren) {
    if (!matchedPublishedIds.has(child.id ?? "")) {
      changes.push({ key: child.id ?? child.name, kind: "removed", label: child.name, fields: [] });
    }
  }

  return sortChanges(changes);
}

function diffDetails(
  draft: ModelDefinitionDraft,
  published: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
): FieldChange[] {
  return [
    fieldChange("Name", published ? published.name : null, draft.name),
    fieldChange("Description", published ? blankToNull(published.description) : null, blankToNull(draft.description)),
    fieldChange(
      "Faction",
      published ? factionName(published.factionId, factionsById) : null,
      factionName(draft.factionId, factionsById),
    ),
  ].filter(isFieldChange);
}

function compareAttachmentSlots(previous: AttachmentSlot, current: AttachmentSlotDraft): FieldChange[] {
  return [fieldChange("Name", previous.name, current.name), fieldChange("Type", previous.type, current.type)].filter(
    isFieldChange,
  );
}

/**
 * Builds the wargear option comparator for one definition. Draft options reference draft slot ids
 * while published options reference published slot ids, so slot references are compared by mapping
 * each draft slot back to the published slot it stands for. Comparing the resolved names instead
 * would report a spurious slot change on every slot rename.
 */
function wargearOptionComparator(
  draftSlots: AttachmentSlotDraft[],
  publishedSlots: AttachmentSlot[],
): (previous: WargearOption, current: WargearOptionDraft) => FieldChange[] {
  const draftSlotNameById = new Map(draftSlots.map((slot) => [slot.id ?? "", slot.name]));
  const publishedSlotNameById = new Map(publishedSlots.map((slot) => [slot.id ?? "", slot.name]));
  const publishedSlotIdByDraftSlotId = new Map(
    draftSlots.map((slot) => [slot.id ?? "", slot.publishedAttachmentSlotId]),
  );

  const draftSlotIdentity = (draftSlotIds: string[] | undefined): string =>
    (draftSlotIds ?? [])
      .map((id) => publishedSlotIdByDraftSlotId.get(id) ?? `new:${id}`)
      .sort((a, b) => a.localeCompare(b))
      .join("|");

  return (previous, current) => {
    const slotsMoved =
      [...(previous.attachmentSlotIds ?? [])].sort((a, b) => a.localeCompare(b)).join("|") !==
      draftSlotIdentity(current.attachmentSlotIds);

    return [
      fieldChange("Name", previous.name, current.name),
      fieldChange("Default loadout", previous.isDefault ? "Yes" : "No", current.isDefault ? "Yes" : "No"),
      slotsMoved
        ? {
            label: "Slots",
            before: slotLabel(previous.attachmentSlotIds, publishedSlotNameById),
            after: slotLabel(current.attachmentSlotIds, draftSlotNameById),
          }
        : null,
    ].filter(isFieldChange);
  };
}

/**
 * Compares an open draft against the published definition it was started from, so an admin can see
 * exactly what publishing would change. Slots and options are matched by their published id rather
 * than by name, so a rename reads as an edit to one row instead of an unrelated add plus remove.
 *
 * Passing no `published` definition treats every value as an addition, which is what a draft for a
 * never-published definition should look like.
 */
export function diffModelDefinitionDraft(
  draft: ModelDefinitionDraft,
  published: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
): DraftDiff {
  const draftSlots = draft.attachmentSlots ?? [];
  const draftOptions = draft.wargearOptions ?? [];
  const publishedSlots = published?.attachmentSlots ?? [];
  const publishedOptions = published?.wargearOptions ?? [];

  const details = diffDetails(draft, published, factionsById);
  const attachmentSlots = diffChildren(
    draftSlots,
    publishedSlots,
    (slot) => slot.publishedAttachmentSlotId,
    compareAttachmentSlots,
  );
  const wargearOptions = diffChildren(
    draftOptions,
    publishedOptions,
    (option) => option.publishedWargearOptionId,
    wargearOptionComparator(draftSlots, publishedSlots),
  );

  return {
    isNew: !published,
    details,
    attachmentSlots,
    wargearOptions,
    changeCount: details.length + attachmentSlots.length + wargearOptions.length,
  };
}
