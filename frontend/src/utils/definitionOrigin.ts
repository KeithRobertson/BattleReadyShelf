import type { Faction, ModelDefinition } from "@/generated";

/**
 * Where a definition in a catalogue came from. A customisation and the shared definition it was
 * forked from are listed side by side and usually share a name, so this is the only thing that
 * tells them apart.
 */
export type DefinitionOrigin = "shared" | "customised" | "own";

export function definitionOrigin(
  ownerUserId: string | null | undefined,
  baseId: string | null | undefined,
): DefinitionOrigin {
  if (!ownerUserId) return "shared";
  return baseId ? "customised" : "own";
}

const ORIGIN_SUFFIX: Record<DefinitionOrigin, string> = {
  shared: "",
  customised: " (your version)",
  own: " (yours)",
};

/**
 * The label to show in a picker. The suffix is part of the label rather than decoration around it
 * so it survives everywhere the label is used - the closed select input, the search box and the
 * dropdown - which matters most for a customisation that kept the original's name.
 */
export function originLabel(name: string | null | undefined, origin: DefinitionOrigin): string {
  return `${name ?? ""}${ORIGIN_SUFFIX[origin]}`;
}

export function modelDefinitionOrigin(definition: ModelDefinition): DefinitionOrigin {
  return definitionOrigin(definition.ownerUserId, definition.baseModelDefinitionId);
}

export function modelDefinitionOptionLabel(definition: ModelDefinition): string {
  return originLabel(definition.name, modelDefinitionOrigin(definition));
}

export function factionOrigin(faction: Faction): DefinitionOrigin {
  return definitionOrigin(faction.ownerUserId, faction.baseFactionId);
}

export function factionOptionLabel(faction: Faction): string {
  return originLabel(faction.name, factionOrigin(faction));
}
