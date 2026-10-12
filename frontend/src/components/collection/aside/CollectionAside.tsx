import { useEffect, useMemo, useRef } from "react";
import { CollectionAsideSummary } from "@/components/collection/aside/CollectionAsideSummary.tsx";
import {
  CollectionModelInspector,
  type ModelInspectorEditing,
} from "@/components/collection/aside/CollectionModelInspector.tsx";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import type { CollectionModelStatus, SavePaintRecipeRequest } from "@/generated";
import useCollectionMetadata from "@/hooks/collections/useCollectionMetadata.ts";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";

type EditorHandlers = Pick<
  ModelInspectorEditing,
  | "onRename"
  | "onDeleteModel"
  | "onUpdateDescription"
  | "onUpdateWargearSelection"
  | "onUpdateAlternateIdentities"
  | "onUpdateStatus"
  | "onRecordStatusChange"
  | "onChangeModelDefinition"
  | "onUploadImage"
  | "onDeleteImage"
  | "onSavePaintRecipe"
>;

/**
 * Pushes this collection's aside (summary or focused-model inspector) into the app shell, and
 * clears it on unmount so other routes do not keep showing collection context.
 *
 * Rendered inside the collection context, but the aside itself mounts next to the main column, so
 * the panels receive props rather than reading context. Handler identities stay stable across
 * renders: a fresh function on every pass would write a new aside node into the shell and loop.
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
    modelImages,
    deletion,
  } = useCollectionContext();
  const { modelDefinitionSelectData } = useCollectionMetadata(collection.collection?.id);

  const focusedModel = collectionModels.models.find((model) => model.id === focus.focusedModelId) ?? null;
  const visibleModels = useMemo(
    () => groupedModels.groupedModels.flatMap((group) => group.models),
    [groupedModels.groupedModels],
  );
  const focusedVisible = visibleModels.some((model) => model.id === focus.focusedModelId);
  const canEdit = collection.isOwner;
  const ownRecipe = focusedModel
    ? paintRecipes.recipeFor({ scope: "MODEL", collectionModelId: focusedModel.id })
    : null;

  useEffect(() => {
    if (focus.focusedModelId && !focusedVisible) {
      focus.clearFocus();
    }
  }, [focus.focusedModelId, focusedVisible, focus.clearFocus]);

  const handlersRef = useRef<EditorHandlers>({
    onRename: () => {},
    onDeleteModel: () => {},
    onUpdateDescription: () => {},
    onUpdateWargearSelection: () => {},
    onUpdateAlternateIdentities: () => {},
    onUpdateStatus: () => {},
    onRecordStatusChange: () => {},
    onChangeModelDefinition: () => {},
    onUploadImage: () => {},
    onDeleteImage: () => {},
    onSavePaintRecipe: () => Promise.resolve(),
  });
  const modelId = focus.focusedModelId;
  handlersRef.current = {
    onRename: (newName: string) => {
      if (modelId) collectionModels.renameModel(modelId, newName);
    },
    onDeleteModel: () => {
      if (modelId) deletion.requestDelete(modelId);
    },
    onUpdateDescription: (description: string) => {
      if (modelId) collectionModels.updateDescription(modelId, description);
    },
    onUpdateWargearSelection: (slotId: string, update: WargearSlotUpdate) => {
      if (focusedModel) collectionModels.updateWargearSelection(focusedModel, slotId, update);
    },
    onUpdateAlternateIdentities: (ids: string[]) => {
      if (modelId) collectionModels.updateAlternateIdentities(modelId, ids);
    },
    onUpdateStatus: (status: CollectionModelStatus) => {
      if (modelId) collectionModels.updateStatus(modelId, status);
    },
    onRecordStatusChange: (status: CollectionModelStatus, changedOn: string) => {
      if (modelId) collectionModels.recordStatusEvent(modelId, status, changedOn);
    },
    onChangeModelDefinition: (modelDefinitionId: string) => {
      if (modelId) collectionModels.changeModelDefinition(modelId, modelDefinitionId);
    },
    onUploadImage: (file: File) => {
      if (modelId) modelImages.uploadImage(modelId, file);
    },
    onDeleteImage: (imageId: string) => {
      if (modelId) modelImages.deleteImage(modelId, imageId);
    },
    onSavePaintRecipe: (request: SavePaintRecipeRequest) => paintRecipes.save(request),
  };

  const handlers = useMemo<EditorHandlers>(
    () => ({
      onRename: (newName) => handlersRef.current.onRename(newName),
      onDeleteModel: () => handlersRef.current.onDeleteModel(),
      onUpdateDescription: (description) => handlersRef.current.onUpdateDescription(description),
      onUpdateWargearSelection: (slotId, update) => handlersRef.current.onUpdateWargearSelection(slotId, update),
      onUpdateAlternateIdentities: (ids) => handlersRef.current.onUpdateAlternateIdentities(ids),
      onUpdateStatus: (status) => handlersRef.current.onUpdateStatus(status),
      onRecordStatusChange: (status, changedOn) => handlersRef.current.onRecordStatusChange(status, changedOn),
      onChangeModelDefinition: (modelDefinitionId) => handlersRef.current.onChangeModelDefinition(modelDefinitionId),
      onUploadImage: (file) => handlersRef.current.onUploadImage(file),
      onDeleteImage: (imageId) => handlersRef.current.onDeleteImage(imageId),
      onSavePaintRecipe: (request) => handlersRef.current.onSavePaintRecipe(request),
    }),
    [],
  );

  const aside = useMemo(() => {
    if (focusedModel && focusedVisible) {
      const editor: ModelInspectorEditing | undefined = canEdit
        ? {
            modelDefinitionSelectData,
            isUploading: modelImages.uploadingModelId === focusedModel.id,
            deletingImageId: modelImages.deletingImageId,
            isDeleting: deletion.pendingDelete?.modelId === focusedModel.id,
            recipe: ownRecipe,
            paints: paintRecipes.paints,
            savingPaints: paintRecipes.saving,
            recordingStatusChange: collectionModels.recordingStatusEvent,
            armyCollectionId: collection.collection?.id,
            ...handlers,
          }
        : undefined;
      return (
        <CollectionModelInspector
          key={focusedModel.id}
          model={focusedModel}
          recipes={paintRecipes.recipes}
          onBack={focus.clearFocus}
          editing={editor}
        />
      );
    }
    return (
      <CollectionAsideSummary
        collectionName={collection.collection?.name ?? "Collection"}
        models={visibleModels}
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
    canEdit,
    modelDefinitionSelectData,
    modelImages.uploadingModelId,
    modelImages.deletingImageId,
    deletion.pendingDelete,
    ownRecipe,
    paintRecipes.paints,
    paintRecipes.saving,
    collectionModels.recordingStatusEvent,
    paintRecipes.recipes,
    collection.collection?.id,
    collection.collection?.name,
    collection.collection?.modelDefinitionOrder,
    handlers,
    focus.clearFocus,
    visibleModels,
    statusFilter,
    setStatusFilter,
    modelFilters,
  ]);
  useAsideContent(aside);

  return null;
}
