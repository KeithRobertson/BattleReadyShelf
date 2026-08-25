import { useMemo } from "react";
import type { CollectionMetadata } from "@/hooks/collections/useCollectionMetadata.ts";
import type { ModelDefinitionSelectData } from "@/pages/CollectionPage.tsx";

export function useFilteredModelDefinitions(collectionMetaData: CollectionMetadata, factionFilter: string[]) {
  const filteredModelDefinitionSelectData = useMemo((): ModelDefinitionSelectData => {
    if (factionFilter.length === 0) return collectionMetaData.modelDefinitionSelectData;

    return collectionMetaData.modelDefinitionSelectData
      .map((group) => ({
        group: group.group,
        items: group.items.filter((item) => {
          const modelDefinition = collectionMetaData.modelDefinitions.find((m) => m.id === item.value);
          return modelDefinition && factionFilter.includes(modelDefinition.factionId ?? "");
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [collectionMetaData.modelDefinitionSelectData, factionFilter, collectionMetaData.modelDefinitions]);

  return { filteredModelDefinitionSelectData };
}
