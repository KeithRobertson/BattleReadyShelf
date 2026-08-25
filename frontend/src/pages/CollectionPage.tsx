import { Alert, Anchor, Loader, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle, IconArrowLeft } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { CollectionAddModelForm } from "@/components/collection/CollectionAddModelForm.tsx";
import CollectionHeader from "@/components/collection/CollectionHeader.tsx";
import { CollectionModelsToolbar } from "@/components/collection/CollectionModelsToolbar.tsx";
import CollectionPublicToggle from "@/components/collection/CollectionPublicToggle.tsx";
import { CollectionContextProvider } from "@/components/collection/context/CollectionContextProvider.tsx";
import DeleteModel from "@/components/collection/DeleteModel.tsx";
import { CollectionGroupsAccordion } from "@/components/collection/group/CollectionGroupsAccordion.tsx";
import { CollectionGroupsDndWrapper } from "@/components/collection/group/CollectionGroupsDndWrapper.tsx";
import type { CollectionModelStatus } from "@/generated";
import { useFilteredModelDefinitions } from "@/hooks/collections/models/useFilteredModelDefinitions.ts";
import useCollection from "@/hooks/collections/useCollection.ts";
import useCollectionEditing from "@/hooks/collections/useCollectionEditing.ts";
import useCollectionMetadata from "@/hooks/collections/useCollectionMetadata";
import useCollectionModels from "@/hooks/collections/useCollectionModels.ts";
import useDeleteConfirmation from "@/hooks/collections/useDeleteConfirmation.ts";
import useGroupDrag from "@/hooks/collections/useGroupDrag.ts";
import useGroupedModels from "@/hooks/collections/useGroupedModels.ts";
import useModelImages from "@/hooks/collections/useModelImages.ts";
import useModelSelection from "@/hooks/collections/useModelSelection.ts";
import { useModelSort } from "@/hooks/collections/useModelSort.ts";
import NotFoundPage from "@/pages//NotFoundPage";

export type ModelDefinitionSelectData = {
  group: string;
  items: { value: string; label: string }[];
}[];

export default function CollectionPage() {
  const [error, setError] = useState<string | null>(null);
  const [modelDefinitionId, setModelDefinitionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState<number | string>(1);
  const [factionFilter, setFactionFilter] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const { collectionId } = useParams<{ collectionId: string }>();
  const collection = useCollection(collectionId);
  const collectionMetaData = useCollectionMetadata(collectionId);
  const collectionModels = useCollectionModels(collectionId);
  const modelSort = useModelSort();
  const [statusFilter, setStatusFilter] = useState<CollectionModelStatus[]>([]);
  const groupedModels = useGroupedModels(
    collectionModels.models,
    collection.collection ?? null,
    modelSort.sortOrder,
    statusFilter,
    modelSort.sortModels,
  );
  const selection = useModelSelection();
  const deletion = useDeleteConfirmation();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const drag = useGroupDrag(
    collectionId,
    groupedModels.groupedModels,
    collection.collection ?? null,
    collection.setCollection,
    setError,
    setOpenGroups,
  );
  const editing = useCollectionEditing(collectionId, collection.collection ?? null, collection.setCollection, setError);
  const modelImages = useModelImages(collectionModels.setModels, setError);
  const { isLoading: isAuthLoading } = useAuth();
  const loading = isAuthLoading || collection.loading || collectionMetaData.loading || collectionModels.loading;
  const fatalError = collection.error || collectionMetaData.error || collectionModels.error;
  const { filteredModelDefinitionSelectData } = useFilteredModelDefinitions(collectionMetaData, factionFilter);

  if (!loading && fatalError) {
    return (
      <NotFoundPage
        title="Collection not found"
        message="This collection doesn't exist or you don't have access to it."
      />
    );
  }

  return (
    <CollectionContextProvider
      collection={collection}
      editing={editing}
      groupedModels={groupedModels}
      selection={selection}
      deletion={deletion}
      drag={drag}
      modelImages={modelImages}
      collectionModels={collectionModels}
      modelSort={modelSort}
      isEditMode={isEditMode}
      setIsEditMode={setIsEditMode}
      statusFilter={statusFilter}
      openGroups={openGroups}
      setOpenGroups={setOpenGroups}
    >
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm" display="inline-flex" style={{ alignItems: "center", gap: 4 }}>
          <IconArrowLeft size={14} /> Back to collections
        </Anchor>

        {collection.collection && <CollectionHeader />}

        <Title order={3}>Collection models</Title>

        <CollectionPublicToggle />

        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Loader />
        ) : (
          <>
            <CollectionAddModelForm
              isOwner={collection.isOwner}
              isEditMode={isEditMode}
              collectionId={collectionId}
              collectionMetaData={collectionMetaData}
              filteredModelDefinitionSelectData={filteredModelDefinitionSelectData}
              modelDefinitionId={modelDefinitionId}
              setModelDefinitionId={setModelDefinitionId}
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              count={count}
              setCount={setCount}
              factionFilter={factionFilter}
              setFactionFilter={setFactionFilter}
              addModel={collectionModels.addModel}
              loading={collectionModels.loading}
            />

            {collectionModels.models.length === 0 ? (
              <Text c="dimmed">No models added to this collection yet.</Text>
            ) : (
              <>
                <CollectionModelsToolbar
                  isEditMode={isEditMode}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  groupedModels={groupedModels}
                  collectionModelsCount={collectionModels.models.length}
                  selection={selection}
                  modelSort={modelSort}
                  deletion={deletion}
                />

                <CollectionGroupsDndWrapper>
                  <CollectionGroupsAccordion />
                </CollectionGroupsDndWrapper>
              </>
            )}
          </>
        )}

        <DeleteModel
          deletion={deletion}
          collectionModels={collectionModels}
          selectedModelIds={selection.selectedModelIds}
        />
      </Stack>
    </CollectionContextProvider>
  );
}
