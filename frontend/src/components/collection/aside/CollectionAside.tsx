import { useEffect, useMemo } from "react";
import { CollectionAsideSummary } from "@/components/collection/aside/CollectionAsideSummary.tsx";
import { CollectionModelInspector } from "@/components/collection/aside/CollectionModelInspector.tsx";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { useAsideContent } from "@/hooks/useAsideContent.ts";

/**
 * Pushes this collection's aside (summary or focused-model inspector) into the app shell, and
 * clears it on unmount so other routes do not keep showing collection context.
 *
 * Rendered inside the collection context, but the aside itself mounts next to the main column, so
 * the panels receive props rather than reading context.
 */
export default function CollectionAside() {
  const {
    focus,
    collection,
    collectionModels,
    groupedModels,
    paintRecipes,
    statusFilter,
    setStatusFilter,
    modelFilters,
  } = useCollectionContext();

  const focusedModel = collectionModels.models.find((model) => model.id === focus.focusedModelId) ?? null;
  const focusedVisible = groupedModels.groupedModels.some((group) =>
    group.models.some((model) => model.id === focus.focusedModelId),
  );

  useEffect(() => {
    if (focus.focusedModelId && !focusedVisible) {
      focus.clearFocus();
    }
  }, [focus.focusedModelId, focusedVisible, focus.clearFocus]);

  const aside = useMemo(() => {
    if (focusedModel && focusedVisible) {
      return <CollectionModelInspector model={focusedModel} recipes={paintRecipes.recipes} onBack={focus.clearFocus} />;
    }
    return (
      <CollectionAsideSummary
        collectionName={collection.collection?.name ?? "Collection"}
        models={collectionModels.models}
        recipes={paintRecipes.recipes}
        modelDefinitionOrder={collection.collection?.modelDefinitionOrder ?? []}
        filters={{
          statusFilter,
          setStatusFilter,
          typeFilter: modelFilters.typeFilter,
          setTypeFilter: modelFilters.setTypeFilter,
          paintFilter: modelFilters.paintFilter,
          setPaintFilter: modelFilters.setPaintFilter,
          wargearFilter: modelFilters.wargearFilter,
          setWargearFilter: modelFilters.setWargearFilter,
        }}
      />
    );
  }, [
    focusedModel,
    focusedVisible,
    collection.collection?.name,
    collection.collection?.modelDefinitionOrder,
    collectionModels.models,
    paintRecipes.recipes,
    focus.clearFocus,
    statusFilter,
    setStatusFilter,
    modelFilters,
  ]);
  useAsideContent(aside);

  return null;
}
