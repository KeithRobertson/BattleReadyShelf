import type { ModelDefinition } from "@/generated";

/**
 * Where a model definition in the catalogue came from. A customisation and the shared definition it
 * was forked from are listed side by side and usually share a name, so this is the only thing that
 * tells them apart.
 */
export type ModelDefinitionOrigin = "shared" | "customised" | "own";

export function modelDefinitionOrigin(definition: ModelDefinition): ModelDefinitionOrigin {
  if (!definition.ownerUserId) return "shared";
  return definition.baseModelDefinitionId ? "customised" : "own";
}

const ORIGIN_SUFFIX: Record<ModelDefinitionOrigin, string> = {
  shared: "",
  customised: " (your version)",
  own: " (yours)",
};

/**
 * The label to show in a picker. The suffix is part of the label rather than decoration around it
 * so it survives everywhere the label is used - the closed select input, the search box and the
 * dropdown - which matters most for a customisation that kept the original's name.
 */
export function modelDefinitionOptionLabel(definition: ModelDefinition): string {
  return `${definition.name ?? ""}${ORIGIN_SUFFIX[modelDefinitionOrigin(definition)]}`;
}
