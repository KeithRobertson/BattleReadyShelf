import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Faction, ModelDefinition } from "@/generated";
import { getFactionsList, getModelDefinitions } from "@/generated";
import { FACTIONS_KEY, MODEL_DEFINITIONS_KEY } from "@/queryKeys.ts";
import { factionOptionLabel, modelDefinitionOptionLabel } from "@/utils/definitionOrigin.ts";
import isInitialLoad from "@/utils/isInitialLoad.ts";

function compareFactionGroups(a: string, b: string): number {
  if (a === "Uncategorised" && b !== "Uncategorised") return 1;
  if (b === "Uncategorised" && a !== "Uncategorised") return -1;
  return a.localeCompare(b);
}

// Shared instances, not `data ?? []`: a failed query has no data, and a fresh array every render
// invalidates every memo below it (see the note in useCollections for where that turns into a loop).
const NO_MODEL_DEFINITIONS: ModelDefinition[] = [];
const NO_FACTIONS: Faction[] = [];

export type CollectionMetadata = ReturnType<typeof useCollectionMetadata>;

export default function useCollectionMetadata(collectionId: string | undefined) {
  const modelDefinitionsQuery = useQuery<ModelDefinition[]>({
    queryKey: [MODEL_DEFINITIONS_KEY, collectionId],
    queryFn: async () => {
      const response = await getModelDefinitions({ throwOnError: true });
      return response.data ?? [];
    },
    enabled: Boolean(collectionId),
    placeholderData: NO_MODEL_DEFINITIONS,
  });
  const {
    data: modelDefinitions = NO_MODEL_DEFINITIONS,
    isLoading: modelDefinitionsLoading,
    isError: isModelDefinitionsError,
    error: modelDefinitionsError,
  } = modelDefinitionsQuery;

  const factionsQuery = useQuery<Faction[]>({
    queryKey: [FACTIONS_KEY, collectionId],
    queryFn: async () => {
      const response = await getFactionsList({ throwOnError: true });
      return response.data ?? [];
    },
    enabled: Boolean(collectionId),
    placeholderData: NO_FACTIONS,
  });
  const {
    data: factions = NO_FACTIONS,
    isLoading: factionsLoading,
    isError: isFactionsError,
    error: factionsError,
  } = factionsQuery;

  let metadataError: string | null = null;

  if (isModelDefinitionsError) {
    metadataError = String(modelDefinitionsError);
  } else if (isFactionsError) {
    metadataError = String(factionsError);
  }

  const factionFilterOptions = useMemo(() => {
    return [...factions]
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))
      .map((f) => ({
        value: f.id ?? "",
        label: factionOptionLabel(f),
      }));
  }, [factions]);

  const modelDefinitionSelectData = useMemo(() => {
    // Keyed by label rather than name so a faction the user has customised stays a group of its
    // own instead of merging with the shared faction it was forked from.
    const factionLabelById = new Map(factions.map((f) => [f.id ?? "", factionOptionLabel(f)]));

    const grouped = new Map<string, { value: string; label: string }[]>();

    for (const modelDefinition of modelDefinitions) {
      const factionName =
        (modelDefinition.factionId && factionLabelById.get(modelDefinition.factionId)) || "Uncategorised";

      const items = grouped.get(factionName) ?? [];
      items.push({
        value: modelDefinition.id ?? "",
        label: modelDefinitionOptionLabel(modelDefinition),
      });
      grouped.set(factionName, items);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => compareFactionGroups(a, b))
      .map(([group, items]) => ({
        group,
        items: items.toSorted((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [modelDefinitions, factions]);

  return {
    modelDefinitions,
    factions,
    factionFilterOptions,
    modelDefinitionSelectData,
    loading:
      modelDefinitionsLoading ||
      factionsLoading ||
      isInitialLoad(modelDefinitionsQuery) ||
      isInitialLoad(factionsQuery),
    error: metadataError,
  };
}
