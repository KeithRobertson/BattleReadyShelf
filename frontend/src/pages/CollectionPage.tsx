import {closestCenter, DndContext, DragOverlay} from "@dnd-kit/core";
import {SortableContext, verticalListSortingStrategy} from "@dnd-kit/sortable";
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconCheck,
  IconGripVertical,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {useState} from "react";
import {Link, useParams} from "react-router-dom";
import {useAuth} from "@/auth/useAuth";
import ModelCard from "@/components/ModelCard";
import type {CollectionModelStatus} from "@/generated";
import SortableAccordionGroup from "@/hooks/collections/models/SortableAccordionGroup.tsx";
import useCollection from "@/hooks/collections/useCollection.ts";
import useCollectionEditing from "@/hooks/collections/useCollectionEditing.ts";
import useCollectionMetadata from "@/hooks/collections/useCollectionMetadata";
import useCollectionModels from "@/hooks/collections/useCollectionModels.ts";
import useDeleteConfirmation from "@/hooks/collections/useDeleteConfirmation.ts";
import useGroupDrag from "@/hooks/collections/useGroupDrag.ts";
import useGroupedModels from "@/hooks/collections/useGroupedModels.ts";
import useModelImages from "@/hooks/collections/useModelImages.ts";
import useModelSelection from "@/hooks/collections/useModelSelection.ts";
import {useModelSort} from "@/hooks/collections/useModelSort.ts";
import NotFoundPage from "@/pages//NotFoundPage";
import type {SortOrder} from "@/types/ModelSort.ts";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
} from "@/utils/collectionModelStatus";

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
  const drag = useGroupDrag(
    collectionId,
    groupedModels.groupedModels,
    collection.collection ?? null,
    collection.setCollection,
    setError,
  );
  const editing = useCollectionEditing(collectionId, collection.collection ?? null, collection.setCollection, setError);
  const modelImages = useModelImages(collectionModels.setModels, setError);
  const { isLoading: isAuthLoading } = useAuth();

  const loading = isAuthLoading || collection.loading || collectionMetaData.loading || collectionModels.loading;

  const fatalError = collection.error || collectionMetaData.error || collectionModels.error;

  if (!loading && fatalError) {
    return (
      <NotFoundPage
        title="Collection not found"
        message="This collection doesn't exist or you don't have access to it."
      />
    );
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/" size="sm" display="inline-flex" style={{ alignItems: "center", gap: 4 }}>
        <IconArrowLeft size={14} /> Back to collections
      </Anchor>

      {collection.collection && (
        <Stack gap={4}>
          <Group justify="space-between" align="center" wrap="wrap">
            {collection.isOwner && editing.isEditingName ? (
              <Group gap={4} wrap="nowrap">
                <TextInput
                  autoFocus
                  value={editing.nameDraft}
                  onChange={(e) => editing.setNameDraft(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") editing.commitEditingName();
                    if (e.key === "Escape") editing.cancelEditingName();
                  }}
                  disabled={editing.savingName}
                  style={{ flex: 1, maxWidth: 400 }}
                />
                <ActionIcon
                  variant="subtle"
                  color="green"
                  onClick={editing.commitEditingName}
                  disabled={editing.savingName}
                  loading={editing.savingName}
                  aria-label="Save collection name"
                >
                  <IconCheck size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={editing.cancelEditingName}
                  disabled={editing.savingName}
                  aria-label="Cancel editing collection name"
                >
                  <IconX size={16} />
                </ActionIcon>
              </Group>
            ) : (
              <Group gap={4} wrap="nowrap">
                <Title order={2}>{collection.collection?.name}</Title>
                {collection.isOwner && (
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    onClick={editing.startEditingName}
                    aria-label="Rename collection"
                    title="Rename collection"
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                )}
              </Group>
            )}

            {collection.isOwner ? (
              <Switch
                label={collection.collection.isPublic ? "Public" : "Private"}
                checked={!!collection.collection.isPublic}
                disabled={editing.savingVisibility}
                onChange={(e) => editing.toggleVisibility(e.currentTarget.checked)}
                size="sm"
              />
            ) : (
              <Badge variant="light" color={collection.collection.isPublic ? "blue" : "gray"} size="sm">
                {collection.collection.isPublic ? "Public" : "Private"}
              </Badge>
            )}
          </Group>

          {collection.collection.userDisplayName && (
            <Group gap={6} align="center">
              <Text size="sm" c="dimmed">
                Created by
              </Text>
              <Badge variant="outline" color="gray" size="sm">
                {collection.collection.userDisplayName}
              </Badge>
            </Group>
          )}

          {collection.isOwner && editing.isEditingDescription ? (
            <Group gap={4} wrap="nowrap" align="flex-start">
              <Textarea
                autoFocus
                autosize
                minRows={2}
                maxRows={4}
                value={editing.descriptionDraft}
                onChange={(e) => editing.setDescriptionDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") editing.cancelEditingDescription();
                }}
                disabled={editing.savingDescription}
                placeholder="Description"
                style={{ flex: 1, maxWidth: 500 }}
              />
              <ActionIcon
                variant="subtle"
                color="green"
                onClick={editing.commitEditingDescription}
                disabled={editing.savingDescription}
                loading={editing.savingDescription}
                aria-label="Save collection description"
              >
                <IconCheck size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={editing.cancelEditingDescription}
                disabled={editing.savingDescription}
                aria-label="Cancel editing collection description"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <Group gap={4} wrap="nowrap">
              <Text c="dimmed" fs={collection.collection.description ? undefined : "italic"}>
                {collection.collection.description || "No description"}
              </Text>
              {collection.isOwner && (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  onClick={editing.startEditingDescription}
                  aria-label="Edit description"
                  title="Edit description"
                >
                  <IconPencil size={16} />
                </ActionIcon>
              )}
            </Group>
          )}
        </Stack>
      )}

      <Title order={3}>Collection models</Title>

      {collection.isOwner && (
        <SegmentedControl
          value={isEditMode ? "edit" : "view"}
          onChange={(value) => setIsEditMode(value === "edit")}
          data={[
            { label: "View", value: "view" },
            { label: "Edit", value: "edit" },
          ]}
          size="xs"
          w={160}
        />
      )}

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          {collectionMetaData.modelDefinitions.length === 0 ? (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              No model types are defined yet.
            </Alert>
          ) : (
            collection.isOwner &&
            isEditMode && (
              <form onSubmit={(e: React.SubmitEvent) => {
                e.preventDefault();

                if (!collectionId || !modelDefinitionId) return;

                const requestedCount = typeof count === "number" ? count : Number.parseInt(count, 10) || 1;

                collectionModels.addModel(modelDefinitionId, name || undefined, description || undefined, requestedCount);

                setName("");
                setDescription("");
                setCount(1);
              }}>
                <Stack gap="xs">
                  <Group align="flex-end" wrap="wrap">
                    <MultiSelect
                      label="Filter by faction"
                      placeholder={factionFilter.length === 0 ? "All factions" : undefined}
                      data={collectionMetaData.factionFilterOptions}
                      value={factionFilter}
                      onChange={setFactionFilter}
                      searchable
                      clearable
                      w={220}
                      hidePickedOptions
                      styles={{
                        pillsList: {
                          display: "flex",
                          flexWrap: "nowrap",
                          overflow: "hidden",
                        },
                      }}
                    />
                    <Select
                      label="Model type"
                      data={collectionMetaData.modelDefinitionSelectData}
                      value={modelDefinitionId}
                      onChange={setModelDefinitionId}
                      searchable
                      required
                      w={220}
                    />
                    <NumberInput label="Count" value={count} onChange={setCount} min={1} max={500} w={100} />
                    <TextInput
                      label="Name (optional)"
                      value={name}
                      onChange={(e) => setName(e.currentTarget.value)}
                      disabled={Number(count) > 1}
                      w={200}
                    />
                    <TextInput
                      label="Description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.currentTarget.value)}
                      disabled={Number(count) > 1}
                      w={240}
                    />
                    <Button type="submit" leftSection={<IconPlus size={16} />} loading={collectionModels.loading}>
                      {Number(count) > 1 ? `Add ${count} models` : "Add model"}
                    </Button>
                  </Group>
                  {Number(count) > 1 && (
                    <Text size="xs" c="dimmed">
                      Models added in bulk are created unnamed — name each one individually afterwards.
                    </Text>
                  )}
                </Stack>
              </form>
            )
          )}

          {collectionModels.models.length === 0 ? (
            <Text c="dimmed">No models added to this collection yet.</Text>
          ) : (
            <>
              <Group justify="space-between" wrap="wrap">
                <Group gap="xs" wrap="wrap">
                  <Text size="sm" c="dimmed">
                    {isEditMode
                      ? selection.selectedModelIds.size > 0
                        ? `${selection.selectedModelIds.size} selected`
                        : "Select models to bulk delete"
                      : (() => {
                          const shownCount = groupedModels.groupedModels.reduce((sum, g) => sum + g.models.length, 0);
                          return statusFilter.length > 0
                            ? `${shownCount} of ${collectionModels.models.length} model${collectionModels.models.length === 1 ? "" : "s"}`
                            : `${shownCount} model${shownCount === 1 ? "" : "s"}`;
                        })()}
                  </Text>
                  {!isEditMode &&
                    groupedModels.statusCounts.map(({ status, count }) => {
                      const isActive = statusFilter.includes(status);
                      return (
                        <Badge
                          key={status}
                          color={COLLECTION_MODEL_STATUS_COLORS[status]}
                          variant={isActive ? "filled" : "light"}
                          size="sm"
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            setStatusFilter((prev) =>
                              prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setStatusFilter((prev) =>
                                prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
                              );
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          {COLLECTION_MODEL_STATUS_LABELS[status]}: {count}
                        </Badge>
                      );
                    })}
                </Group>
                <Group gap="sm" align="flex-end">
                  <MultiSelect
                    label="Filter by status"
                    placeholder={statusFilter.length === 0 ? "All" : undefined}
                    data={COLLECTION_MODEL_STATUS_OPTIONS}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value as CollectionModelStatus[])}
                    w={220}
                    size="xs"
                    clearable
                  />
                  <Select
                    label="Sort by"
                    data={modelSort.sortOptions}
                    value={modelSort.sortOrder}
                    onChange={(value) => value && modelSort.setSortOrder(value as SortOrder)}
                    w={220}
                    size="xs"
                    allowDeselect={false}
                  />
                  {isEditMode && (
                    <Button
                      color="red"
                      variant="light"
                      size="xs"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => deletion.requestBulkDelete(selection.selectedModelIds)}
                      disabled={selection.selectedModelIds.size === 0}
                    >
                      Delete selected
                    </Button>
                  )}
                </Group>
              </Group>
              <DndContext
                sensors={drag.sensors}
                collisionDetection={closestCenter}
                onDragStart={drag.handleGroupDragStart}
                onDragEnd={drag.handleGroupDragEnd}
                onDragCancel={() => drag.setDraggingGroupKey(null)}
              >
                <SortableContext
                  items={groupedModels.groupedModels.map((group) => group.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <Accordion
                    multiple
                    defaultValue={groupedModels.groupedModels.map((group) => group.key)}
                    variant="separated"
                  >
                    {groupedModels.groupedModels.map((group) => {
                      const selectedInGroup = group.models.filter(
                        (model) => model.id && selection.selectedModelIds.has(model.id),
                      ).length;
                      return (
                        <SortableAccordionGroup key={group.key} group={group}>
                          {({ attributes, listeners }) => (
                            <>
                              <Accordion.Control>
                                <Group justify="space-between" wrap="nowrap" pr="sm">
                                  <Group gap="xs">
                                    {isEditMode && (
                                      <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        size="sm"
                                        style={{ cursor: "grab", touchAction: "none" }}
                                        onClick={(e) => e.stopPropagation()}
                                        aria-label="Drag to reorder"
                                        {...attributes}
                                        {...listeners}
                                      >
                                        <IconGripVertical size={16} />
                                      </ActionIcon>
                                    )}
                                    <Text fw={500}>{group.label}</Text>
                                    <Badge variant="light">{group.models.length}</Badge>
                                  </Group>
                                  {isEditMode && selectedInGroup > 0 && (
                                    <Badge color="red" variant="light">
                                      {selectedInGroup} selected
                                    </Badge>
                                  )}
                                </Group>
                              </Accordion.Control>
                              {/* Hide panel content for every group while any drag is active so the whole list
                                  collapses to just headers - reordering shouldn't require moving expanded content. */}
                              {!drag.draggingGroupKey && (
                                <Accordion.Panel>
                                  <Stack gap="xs">
                                    {isEditMode && (
                                      <Checkbox
                                        label="Select all in this group"
                                        checked={selectedInGroup === group.models.length}
                                        indeterminate={selectedInGroup > 0 && selectedInGroup < group.models.length}
                                        onChange={(e) => selection.toggleGroupSelected(group, e.currentTarget.checked)}
                                      />
                                    )}
                                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                      {group.models.map((model) => (
                                        <ModelCard
                                          key={model.id}
                                          model={model}
                                          editMode={isEditMode}
                                          onUploadImage={(file) => model.id && modelImages.uploadImage(model.id, file)}
                                          onDeleteImage={(imageId) =>
                                            model.id && modelImages.deleteImage(model.id, imageId)
                                          }
                                          onRename={(newName) => {
                                            if (!model.id) return;
                                            return collectionModels.renameModel(model.id, newName);
                                          }}
                                          onDeleteModel={() => model.id && deletion.requestDelete(model.id)}
                                          onUpdateFinishedOn={(finishedOn) => {
                                            if (!model.id) return;
                                            return collectionModels.updateFinishedOn(model.id, finishedOn);
                                          }}
                                          onUpdateDescription={(description) => {
                                            if (!model.id) return;
                                            return collectionModels.updateDescription(model.id, description);
                                          }}
                                          onUpdateWargearSelection={(attachmentSlotId, update) =>
                                            collectionModels.updateWargearSelection(model, attachmentSlotId, update)
                                          }
                                          onUpdateStatus={(status) => {
                                            if (!model.id) return;
                                            return collectionModels.updateStatus(
                                              model.id,
                                              status as CollectionModelStatus,
                                            );
                                          }}
                                          isUploading={modelImages.uploadingModelId === model.id}
                                          deletingImageId={modelImages.deletingImageId}
                                          isDeleting={deletion.pendingDelete?.modelId === model.id}
                                          selected={!!model.id && selection.selectedModelIds.has(model.id)}
                                          onToggleSelected={(isSelected) =>
                                            model.id && selection.toggleSelected(model.id, isSelected)
                                          }
                                        />
                                      ))}
                                    </SimpleGrid>
                                  </Stack>
                                </Accordion.Panel>
                              )}
                            </>
                          )}
                        </SortableAccordionGroup>
                      );
                    })}
                  </Accordion>
                </SortableContext>
                <DragOverlay>
                  {drag.draggingGroupKey &&
                    (() => {
                      const draggedGroup = groupedModels.groupedModels.find((g) => g.key === drag.draggingGroupKey);
                      if (!draggedGroup) return null;
                      return (
                        <Group
                          justify="space-between"
                          wrap="nowrap"
                          pr="sm"
                          p="md"
                          style={{
                            background: "var(--mantine-color-body)",
                            border: "1px solid var(--mantine-color-default-border)",
                            borderRadius: "var(--mantine-radius-default)",
                            boxShadow: "var(--mantine-shadow-md)",
                          }}
                        >
                          <Group gap="xs">
                            <IconGripVertical size={16} />
                            <Text fw={500}>{draggedGroup.label}</Text>
                            <Badge variant="light">{draggedGroup.models.length}</Badge>
                          </Group>
                        </Group>
                      );
                    })()}
                </DragOverlay>
              </DndContext>
            </>
          )}
        </>
      )}

      <Modal
        opened={deletion.confirmOpened}
        onClose={deletion.closeConfirm}
        title={deletion.pendingDelete?.mode === "bulk" ? "Delete selected models?" : "Delete model?"}
      >
        <Stack gap="md">
          <Text size="sm">
            {deletion.pendingDelete?.mode === "bulk"
              ? `This will permanently delete ${selection.selectedModelIds.size} model(s) and their images. This cannot be undone.`
              : "This will permanently delete this model and its images. This cannot be undone."}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={deletion.closeConfirm}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() =>
                deletion.confirmDelete(
                  collectionModels.deleteModel,
                  collectionModels.bulkDeleteModels,
                  selection.selectedModelIds,
                )
              }
              loading={collectionModels.loading}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
