import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { AppOutletContext } from "@/components/AppOutletContext.ts";
import { CollectionAsideSummary } from "@/components/collection/aside/CollectionAsideSummary.tsx";
import { CollectionModelInspector } from "@/components/collection/aside/CollectionModelInspector.tsx";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";

/**
 * Pushes this collection's aside (summary or focused-model inspector) into the app shell, and
 * clears it on unmount so other routes do not keep showing collection context.
 *
 * Rendered inside the collection context, but the aside itself mounts next to the main column, so
 * the panels receive props rather than reading context.
 */
export default function CollectionAside() {
  const { setAsideContent } = useOutletContext<AppOutletContext>();
  const { focus, collection, collectionModels, groupedModels, paintRecipes } = useCollectionContext();

  const focusedModel = collectionModels.models.find((model) => model.id === focus.focusedModelId) ?? null;
  const focusedVisible = groupedModels.groupedModels.some((group) =>
    group.models.some((model) => model.id === focus.focusedModelId),
  );

  useEffect(() => {
    if (focus.focusedModelId && !focusedVisible) {
      focus.clearFocus();
    }
  }, [focus.focusedModelId, focusedVisible, focus.clearFocus]);

  useEffect(() => {
    if (focusedModel && focusedVisible) {
      setAsideContent(
        <CollectionModelInspector model={focusedModel} recipes={paintRecipes.recipes} onBack={focus.clearFocus} />,
      );
    } else {
      setAsideContent(
        <CollectionAsideSummary
          collectionName={collection.collection?.name ?? "Collection"}
          models={collectionModels.models}
          recipes={paintRecipes.recipes}
          modelDefinitionOrder={collection.collection?.modelDefinitionOrder ?? []}
        />,
      );
    }
    return () => setAsideContent(null);
  }, [
    focusedModel,
    focusedVisible,
    collection.collection?.name,
    collection.collection?.modelDefinitionOrder,
    collectionModels.models,
    paintRecipes.recipes,
    focus.clearFocus,
    setAsideContent,
  ]);

  return null;
}
