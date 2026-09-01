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
  /** True when there is no counterpart to compare against, so the whole definition reads as new. */
  isNew: boolean;
  details: FieldChange[];
  attachmentSlots: ChildChange[];
  wargearOptions: ChildChange[];
  changeCount: number;
}

const KIND_ORDER: Record<ChangeKind, number> = { changed: 0, added: 1, removed: 2 };

/** The fields every child row shares, which is all the generic matcher needs. */
interface NamedChild {
  readonly id?: string;
  name: string;
}

/** Satisfied by both `AttachmentSlot` and `AttachmentSlotDraft`. */
interface ComparableSlot extends NamedChild {
  type: string;
}

/** Satisfied by both `WargearOption` and `WargearOptionDraft`. */
interface ComparableOption extends NamedChild {
  isDefault: boolean;
  attachmentSlotIds: string[];
}

/**
 * A definition-like object whose slots and options each point back at the row they were derived
 * from. Admin drafts point at the published definition they were opened from; a user's personal
 * definition points at the shared one they customised. The comparison is otherwise identical.
 */
interface ComparableDefinition<S extends ComparableSlot, O extends ComparableOption> {
  name: string;
  description?: string;
  factionId?: string;
  attachmentSlots?: S[];
  wargearOptions?: O[];
}

/** How a derived row names the row it came from - the only per-comparison difference. */
interface BasePointers<S, O> {
  slotBaseId: (slot: S) => string | null | undefined;
  optionBaseId: (option: O) => string | null | undefined;
}

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
 * Renders an option's slot references as a human-readable label. Each side references its own
 * definition's slot ids, so each is resolved against its own slot list.
 */
function slotLabel(slotIds: string[] | undefined, namesById: Map<string, string>): string | null {
  const names = (slotIds ?? []).map((id) => namesById.get(id) ?? id).sort((a, b) => a.localeCompare(b));
  return names.length > 0 ? names.join(", ") : null;
}

function sortChanges(changes: ChildChange[]): ChildChange[] {
  return [...changes].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.localeCompare(b.label));
}

/**
 * Matches derived children against the base rows they came from and classifies each as added,
 * changed or removed. Attachment slots and wargear options only differ in how a row points back at
 * its base and in which fields are worth comparing.
 */
function diffChildren<D extends NamedChild, P extends NamedChild>(
  currentChildren: D[],
  baseChildren: P[],
  baseIdOf: (child: D) => string | null | undefined,
  compareFields: (previous: P, current: D) => FieldChange[],
): ChildChange[] {
  const baseById = new Map(baseChildren.map((child) => [child.id ?? "", child]));
  const matchedBaseIds = new Set<string>();
  const changes: ChildChange[] = [];

  for (const child of currentChildren) {
    const baseId = baseIdOf(child);
    const previous = baseId ? baseById.get(baseId) : undefined;
    if (!previous) {
      changes.push({ key: child.id ?? child.name, kind: "added", label: child.name, fields: [] });
      continue;
    }

    matchedBaseIds.add(previous.id ?? "");
    const fields = compareFields(previous, child);
    if (fields.length > 0) {
      changes.push({ key: child.id ?? child.name, kind: "changed", label: previous.name, fields });
    }
  }

  for (const child of baseChildren) {
    if (!matchedBaseIds.has(child.id ?? "")) {
      changes.push({ key: child.id ?? child.name, kind: "removed", label: child.name, fields: [] });
    }
  }

  return sortChanges(changes);
}

function diffDetails<S extends ComparableSlot, O extends ComparableOption>(
  current: ComparableDefinition<S, O>,
  base: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
): FieldChange[] {
  return [
    fieldChange("Name", base ? base.name : null, current.name),
    fieldChange("Description", base ? blankToNull(base.description) : null, blankToNull(current.description)),
    fieldChange(
      "Faction",
      base ? factionName(base.factionId, factionsById) : null,
      factionName(current.factionId, factionsById),
    ),
  ].filter(isFieldChange);
}

function compareAttachmentSlots(previous: AttachmentSlot, current: ComparableSlot): FieldChange[] {
  return [fieldChange("Name", previous.name, current.name), fieldChange("Type", previous.type, current.type)].filter(
    isFieldChange,
  );
}

/**
 * Builds the wargear option comparator for one definition. The derived options reference the
 * derived definition's own slot ids while the base options reference the base's, so slot
 * references are compared by mapping each derived slot back to the base slot it stands for.
 * Comparing the resolved names instead would report a spurious slot change on every slot rename.
 */
function wargearOptionComparator<S extends ComparableSlot>(
  currentSlots: S[],
  baseSlots: AttachmentSlot[],
  slotBaseId: (slot: S) => string | null | undefined,
): (previous: WargearOption, current: ComparableOption) => FieldChange[] {
  const currentSlotNameById = new Map(currentSlots.map((slot) => [slot.id ?? "", slot.name]));
  const baseSlotNameById = new Map(baseSlots.map((slot) => [slot.id ?? "", slot.name]));
  const baseSlotIdByCurrentSlotId = new Map(currentSlots.map((slot) => [slot.id ?? "", slotBaseId(slot)]));

  const currentSlotIdentity = (currentSlotIds: string[] | undefined): string =>
    (currentSlotIds ?? [])
      .map((id) => baseSlotIdByCurrentSlotId.get(id) ?? `new:${id}`)
      .sort((a, b) => a.localeCompare(b))
      .join("|");

  return (previous, current) => {
    const slotsMoved =
      [...(previous.attachmentSlotIds ?? [])].sort((a, b) => a.localeCompare(b)).join("|") !==
      currentSlotIdentity(current.attachmentSlotIds);

    return [
      fieldChange("Name", previous.name, current.name),
      fieldChange("Default loadout", previous.isDefault ? "Yes" : "No", current.isDefault ? "Yes" : "No"),
      slotsMoved
        ? {
            label: "Slots",
            before: slotLabel(previous.attachmentSlotIds, baseSlotNameById),
            after: slotLabel(current.attachmentSlotIds, currentSlotNameById),
          }
        : null,
    ].filter(isFieldChange);
  };
}

/**
 * Compares a derived definition against the one it came from. Slots and options are matched by the
 * base row each points at rather than by name, so a rename reads as an edit to one row instead of
 * an unrelated add plus remove.
 *
 * Passing no `base` treats every value as an addition, which is what a definition with no
 * counterpart should look like.
 */
function diffAgainstBase<S extends ComparableSlot, O extends ComparableOption>(
  current: ComparableDefinition<S, O>,
  base: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
  pointers: BasePointers<S, O>,
): DraftDiff {
  const currentSlots = current.attachmentSlots ?? [];
  const currentOptions = current.wargearOptions ?? [];
  const baseSlots = base?.attachmentSlots ?? [];
  const baseOptions = base?.wargearOptions ?? [];

  const details = diffDetails(current, base, factionsById);
  const attachmentSlots = diffChildren(currentSlots, baseSlots, pointers.slotBaseId, compareAttachmentSlots);
  const wargearOptions = diffChildren(
    currentOptions,
    baseOptions,
    pointers.optionBaseId,
    wargearOptionComparator(currentSlots, baseSlots, pointers.slotBaseId),
  );

  return {
    isNew: !base,
    details,
    attachmentSlots,
    wargearOptions,
    changeCount: details.length + attachmentSlots.length + wargearOptions.length,
  };
}

/**
 * Compares an open admin draft against the published definition it was started from, so an admin
 * can see exactly what publishing would change.
 */
export function diffModelDefinitionDraft(
  draft: ModelDefinitionDraft,
  published: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
): DraftDiff {
  return diffAgainstBase<AttachmentSlotDraft, WargearOptionDraft>(draft, published, factionsById, {
    slotBaseId: (slot) => slot.publishedAttachmentSlotId,
    optionBaseId: (option) => option.publishedWargearOptionId,
  });
}

/**
 * Compares one of a user's own definitions against the shared definition they customised, so they
 * can see how their version differs from everyone else's - and what reverting would give back.
 *
 * A definition the user wrote from scratch has no `base`, so every value reads as an addition.
 */
export function diffPersonalModelDefinition(
  personal: ModelDefinition,
  base: ModelDefinition | undefined,
  factionsById: Map<string, Faction>,
): DraftDiff {
  return diffAgainstBase<AttachmentSlot, WargearOption>(personal, base, factionsById, {
    slotBaseId: (slot) => slot.baseAttachmentSlotId,
    optionBaseId: (option) => option.baseWargearOptionId,
  });
}
