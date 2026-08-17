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
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent, DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { isAxiosError } from "axios";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import ModelCard from "../components/ModelCard";
import type { ArmyCollection, CollectionModel, CollectionModelStatus, ModelDefinition } from "../generated";
import {
  bulkCreateCollectionModels,
  bulkDeleteCollectionModels,
  createCollectionModel,
  createCollectionModelImageUploadUrl,
  deleteCollectionModel,
  deleteCollectionModelImage,
  getArmyCollection,
  getCollectionModels,
  getModelDefinitions,
  reorderModelDefinitionGroups,
  updateArmyCollection,
  updateCollectionModel,
} from "../generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
  COLLECTION_MODEL_STATUSES,
} from "../utils/collectionModelStatus";
import { createImageVariants } from "../utils/imageVariants";
import NotFoundPage from "./NotFoundPage";

type ModelGroup = {
  key: string;
  label: string;
  models: CollectionModel[];
};

type SortField = "name" | "status" | "date";
type SortDirection = "asc" | "desc";
type SortOrder = `${SortField}-${SortDirection}`;

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "status-asc", label: "Status (Boxed → Painted)" },
  { value: "status-desc", label: "Status (Painted → Boxed)" },
  { value: "date-asc", label: "Date finished (oldest first)" },
  { value: "date-desc", label: "Date finished (newest first)" },
];

/** Sorts models by the chosen field/direction; models missing that field's value always sort to the end. */
function sortModels(models: CollectionModel[], sortOrder: SortOrder): CollectionModel[] {
  const [field, dir] = sortOrder.split("-") as [SortField, SortDirection];
  const direction = dir === "asc" ? 1 : -1;
  return [...models].sort((a, b) => {
    if (field === "status") {
      const rankA = a.status ? COLLECTION_MODEL_STATUSES.indexOf(a.status) : -1;
      const rankB = b.status ? COLLECTION_MODEL_STATUSES.indexOf(b.status) : -1;
      if (rankA === -1 && rankB === -1) return 0;
      if (rankA === -1) return 1;
      if (rankB === -1) return -1;
      return direction * (rankA - rankB);
    }
    if (field === "date") {
      const dateA = a.finishedOn;
      const dateB = b.finishedOn;
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return direction * dateA.localeCompare(dateB);
    }
    const nameA = a.name?.trim();
    const nameB = b.name?.trim();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;
    return direction * nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  });
}

/**
 * Wraps a single Accordion.Item so it can be reordered via drag-and-drop. The drag handle (not the
 * whole control) carries the dnd-kit listeners, so clicking elsewhere in the header still toggles
 * the accordion section as normal.
 */
function SortableAccordionGroup({
  group,
  children,
}: {
  group: ModelGroup;
  children: (dragHandleProps: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key });
  return (
    <Accordion.Item
      value={group.key}
      ref={setNodeRef}
      style={{
        // While dragging, only the transform (not a full-height carry of the expanded panel) moves with
        // the pointer - the panel content is hidden below so the item collapses to just its header height.
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
    >
      {children({ attributes, listeners, isDragging })}
    </Accordion.Item>
  );
}

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [armyCollection, setArmyCollection] = useState<ArmyCollection | null>(null);
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [models, setModels] = useState<CollectionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectionNotFound, setCollectionNotFound] = useState(false);
  const [modelDefinitionId, setModelDefinitionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState<number | string>(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [renamingModelId, setRenamingModelId] = useState<string | null>(null);
  const [updatingFinishedOnModelId, setUpdatingFinishedOnModelId] = useState<string | null>(null);
  const [updatingDescriptionModelId, setUpdatingDescriptionModelId] = useState<string | null>(null);
  const [updatingWargearSlotKey, setUpdatingWargearSlotKey] = useState<string | null>(null);
  const [updatingStatusModelId, setUpdatingStatusModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CollectionModelStatus[]>([]);
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [pendingDelete, setPendingDelete] = useState<{ mode: "single" | "bulk"; modelId?: string } | null>(null);
  const [isEditingCollectionName, setIsEditingCollectionName] = useState(false);
  const [collectionNameDraft, setCollectionNameDraft] = useState("");
  const [savingCollectionName, setSavingCollectionName] = useState(false);
  const [isEditingCollectionDescription, setIsEditingCollectionDescription] = useState(false);
  const [collectionDescriptionDraft, setCollectionDescriptionDraft] = useState("");
  const [savingCollectionDescription, setSavingCollectionDescription] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("name-asc");

  const statusCounts = useMemo(() => {
    const counts = new Map<CollectionModelStatus, number>();
    for (const m of models) {
      if (m.status) {
        counts.set(m.status, (counts.get(m.status) ?? 0) + 1);
      }
    }
    return COLLECTION_MODEL_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })).filter(
      (entry) => entry.count > 0,
    );
  }, [models]);

  const groupedModels = useMemo<ModelGroup[]>(() => {
    const filteredModels =
      statusFilter.length === 0 ? models : models.filter((m) => m.status && statusFilter.includes(m.status));
    const groups = new Map<string, ModelGroup>();
    for (const m of filteredModels) {
      const key = m.modelDefinitionId ?? "unknown";
      const label = m.modelDefinition?.name ?? "Unknown type";
      const existing = groups.get(key);
      if (existing) {
        existing.models.push(m);
      } else {
        groups.set(key, { key, label, models: [m] });
      }
    }
    const orderIndex = new Map((armyCollection?.modelDefinitionOrder ?? []).map((id, i) => [id, i]));
    return [...groups.values()]
      .sort((a, b) => {
        const aIndex = orderIndex.get(a.key);
        const bIndex = orderIndex.get(b.key);
        if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
        if (aIndex !== undefined) return -1;
        if (bIndex !== undefined) return 1;
        return a.label.localeCompare(b.label);
      })
      .map((group) => ({ ...group, models: sortModels(group.models, sortOrder) }));
  }, [models, sortOrder, statusFilter, armyCollection?.modelDefinitionOrder]);

  const groupDragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [draggingGroupKey, setDraggingGroupKey] = useState<string | null>(null);

  function handleGroupDragStart(event: DragStartEvent) {
    setDraggingGroupKey(String(event.active.id));
  }

  function handleGroupDragEnd(event: DragEndEvent) {
    setDraggingGroupKey(null);
    const { active, over } = event;
    if (!over || active.id === over.id || !collectionId) return;
    const oldIndex = groupedModels.findIndex((g) => g.key === active.id);
    const newIndex = groupedModels.findIndex((g) => g.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(groupedModels, oldIndex, newIndex)
      .map((g) => g.key)
      .filter((key) => key !== "unknown");
    const previousOrder = armyCollection?.modelDefinitionOrder ?? [];
    setArmyCollection((prev) => (prev ? { ...prev, modelDefinitionOrder: reorderedIds } : prev));

    reorderModelDefinitionGroups({
      path: { armyCollectionId: collectionId },
      body: { modelDefinitionIds: reorderedIds },
      throwOnError: true,
    }).catch((e) => {
      setArmyCollection((prev) => (prev ? { ...prev, modelDefinitionOrder: previousOrder } : prev));
      setError(String(e));
    });
  }


  useEffect(() => {
    if (!collectionId || !isAuthenticated) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setCollectionNotFound(false);
    Promise.all([
      getArmyCollection({ path: { armyCollectionId: collectionId }, signal: ac.signal, throwOnError: true }),
      getModelDefinitions({ signal: ac.signal }),
      getCollectionModels({ path: { armyCollectionId: collectionId }, signal: ac.signal, throwOnError: true }),
    ])
      .then(([armyCollectionRes, modelDefinitionsRes, modelsRes]) => {
        if (ac.signal.aborted) return;
        setArmyCollection(armyCollectionRes.data ?? null);
        setModelDefinitions(modelDefinitionsRes.data ?? []);
        setModels(modelsRes.data ?? []);
        if ((modelDefinitionsRes.data?.length ?? 0) > 0) {
          setModelDefinitionId(modelDefinitionsRes.data?.[0]?.id ?? null);
        }
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        if (isAxiosError(e) && e.response?.status === 404) {
          setCollectionNotFound(true);
        } else {
          setError(String(e));
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [collectionId, isAuthenticated]);

  function startEditingCollectionName() {
    setCollectionNameDraft(armyCollection?.name ?? "");
    setIsEditingCollectionName(true);
  }

  async function commitEditingCollectionName() {
    setIsEditingCollectionName(false);
    const newName = collectionNameDraft.trim();
    if (!collectionId || !newName || newName === armyCollection?.name) return;
    setError(null);
    setSavingCollectionName(true);
    try {
      const updated = (
        await updateArmyCollection({ path: { armyCollectionId: collectionId }, body: { name: newName } })
      ).data;
      if (updated) setArmyCollection(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingCollectionName(false);
    }
  }

  function startEditingCollectionDescription() {
    setCollectionDescriptionDraft(armyCollection?.description ?? "");
    setIsEditingCollectionDescription(true);
  }

  async function commitEditingCollectionDescription() {
    setIsEditingCollectionDescription(false);
    const newDescription = collectionDescriptionDraft.trim();
    if (!collectionId || newDescription === (armyCollection?.description ?? "")) return;
    setError(null);
    setSavingCollectionDescription(true);
    try {
      const updated = (
        await updateArmyCollection({
          path: { armyCollectionId: collectionId },
          body: { description: newDescription },
        })
      ).data;
      if (updated) setArmyCollection(updated);
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingCollectionDescription(false);
    }
  }

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    if (!collectionId || !modelDefinitionId) return;
    setError(null);
    setAdding(true);
    try {
      const requestedCount = typeof count === "number" ? count : Number.parseInt(count, 10) || 1;
      if (requestedCount > 1) {
        const created = (
          await bulkCreateCollectionModels({
            path: { armyCollectionId: collectionId },
            body: { modelDefinitionId, count: requestedCount },
          })
        ).data;
        if (!created) {
          throw new Error("Failed to add models");
        }
        setModels((s) => [...created, ...s]);
      } else {
        const created = (
          await createCollectionModel({
            path: { armyCollectionId: collectionId },
            body: { modelDefinitionId, name: name || undefined, description: description || undefined },
          })
        ).data;
        if (!created) {
          throw new Error("Failed to add model");
        }
        setModels((s) => [created, ...s]);
      }
      setName("");
      setDescription("");
      setCount(1);
    } catch (e) {
      setError(String(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleRenameModel(modelId: string, newName: string) {
    setError(null);
    setRenamingModelId(modelId);
    try {
      const updated = (await updateCollectionModel({ path: { collectionModelId: modelId }, body: { name: newName } }))
        .data;
      if (updated) {
        setModels((s) => s.map((m) => (m.id === modelId ? updated : m)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRenamingModelId(null);
    }
  }

  async function handleUpdateFinishedOn(modelId: string, finishedOn: string | null) {
    setError(null);
    setUpdatingFinishedOnModelId(modelId);
    try {
      const updated = (
        await updateCollectionModel({
          path: { collectionModelId: modelId },
          body: { finishedOn: finishedOn ?? undefined },
        })
      ).data;
      if (updated) {
        setModels((s) => s.map((m) => (m.id === modelId ? updated : m)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdatingFinishedOnModelId(null);
    }
  }

  async function handleUpdateDescription(modelId: string, description: string) {
    setError(null);
    setUpdatingDescriptionModelId(modelId);
    try {
      const updated = (
        await updateCollectionModel({ path: { collectionModelId: modelId }, body: { description } })
      ).data;
      if (updated) {
        setModels((s) => s.map((m) => (m.id === modelId ? updated : m)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdatingDescriptionModelId(null);
    }
  }

  async function handleUpdateStatus(modelId: string, status: CollectionModelStatus) {
    setError(null);
    setUpdatingStatusModelId(modelId);
    try {
      const updated = (await updateCollectionModel({ path: { collectionModelId: modelId }, body: { status } })).data;
      if (updated) {
        setModels((s) => s.map((m) => (m.id === modelId ? updated : m)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdatingStatusModelId(null);
    }
  }

  /**
   * Assigns (or clears) the wargear filling one of a model's attachment slots, either to a
   * recognised wargear option (wargearOptionId) or a free-text custom label for homebrew/converted
   * loadouts (customLabel), leaving its other slot assignments untouched.
   */
  async function handleUpdateWargearSelection(
    model: CollectionModel,
    attachmentSlotId: string,
    update: { wargearOptionId?: string | null; customLabel?: string | null },
  ) {
    if (!model.id) return;
    const modelId = model.id;
    const slotKey = `${modelId}:${attachmentSlotId}`;
    setError(null);
    setUpdatingWargearSlotKey(slotKey);
    try {
      const otherSelections = (model.wargearSelections ?? []).filter(
        (s) => s.attachmentSlotId !== attachmentSlotId,
      );
      const wargearSelections = [
        ...otherSelections,
        {
          attachmentSlotId,
          wargearOptionId: update.wargearOptionId ?? undefined,
          customLabel: update.customLabel ?? undefined,
        },
      ];
      const updated = (
        await updateCollectionModel({ path: { collectionModelId: modelId }, body: { wargearSelections } })
      ).data;
      if (updated) {
        setModels((s) => s.map((m) => (m.id === modelId ? updated : m)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setUpdatingWargearSlotKey(null);
    }
  }

  async function handleUploadImage(modelId: string, file: File) {
    setError(null);
    setUploadingModelId(modelId);
    try {
      const variants = await createImageVariants(file);
      const created = (
        await createCollectionModelImageUploadUrl({
          path: { collectionModelId: modelId },
          body: {
            large: { contentType: variants.large.type, contentLengthBytes: variants.large.size },
            thumbnail: { contentType: variants.thumbnail.type, contentLengthBytes: variants.thumbnail.size },
          },
        })
      ).data;
      if (!created) {
        throw new Error("Failed to request upload URL");
      }
      const uploads = [
        { url: created.uploadUrls.large, body: variants.large, contentType: variants.large.type },
        { url: created.uploadUrls.thumbnail, body: variants.thumbnail, contentType: variants.thumbnail.type },
      ];
      const responses = await Promise.all(
        uploads.map(({ url, body, contentType }) =>
          fetch(url, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body,
          }),
        ),
      );
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        throw new Error(`Upload to storage failed: ${failed.status}`);
      }
      setModels((s) => s.map((m) => (m.id === modelId ? { ...m, images: [...(m.images ?? []), created.image] } : m)));
    } catch (e) {
      setError(String(e));
    } finally {
      setUploadingModelId(null);
    }
  }

  async function handleDeleteImage(modelId: string, imageId: string) {
    setError(null);
    setDeletingImageId(imageId);
    try {
      await deleteCollectionModelImage({ path: { collectionModelId: modelId, imageId } });
      setModels((s) =>
        s.map((m) => (m.id === modelId ? { ...m, images: (m.images ?? []).filter((img) => img.id !== imageId) } : m)),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingImageId(null);
    }
  }

  function toggleSelected(modelId: string, isSelected: boolean) {
    setSelectedModelIds((s) => {
      const next = new Set(s);
      if (isSelected) next.add(modelId);
      else next.delete(modelId);
      return next;
    });
  }

  function toggleGroupSelected(group: ModelGroup, isSelected: boolean) {
    setSelectedModelIds((s) => {
      const next = new Set(s);
      for (const m of group.models) {
        if (!m.id) continue;
        if (isSelected) next.add(m.id);
        else next.delete(m.id);
      }
      return next;
    });
  }

  function requestDeleteModel(modelId: string) {
    setPendingDelete({ mode: "single", modelId });
    openConfirm();
  }

  function requestBulkDelete() {
    if (selectedModelIds.size === 0) return;
    setPendingDelete({ mode: "bulk" });
    openConfirm();
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || !collectionId) return;
    setError(null);
    try {
      if (pendingDelete.mode === "single" && pendingDelete.modelId) {
        const modelId = pendingDelete.modelId;
        setDeletingModelId(modelId);
        await deleteCollectionModel({ path: { collectionModelId: modelId } });
        setModels((s) => s.filter((m) => m.id !== modelId));
        setSelectedModelIds((s) => {
          const next = new Set(s);
          next.delete(modelId);
          return next;
        });
      } else {
        setBulkDeleting(true);
        const idsToDelete = [...selectedModelIds];
        await bulkDeleteCollectionModels({
          path: { armyCollectionId: collectionId },
          body: { collectionModelIds: idsToDelete },
        });
        setModels((s) => s.filter((m) => !m.id || !selectedModelIds.has(m.id)));
        setSelectedModelIds(new Set());
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingModelId(null);
      setBulkDeleting(false);
      setPendingDelete(null);
      closeConfirm();
    }
  }

  if (!isAuthLoading && isAuthenticated && !loading && collectionNotFound) {
    return <NotFoundPage title="Collection not found" message="This collection doesn't exist or you don't have access to it." />;
  }

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/" size="sm" display="inline-flex" style={{ alignItems: "center", gap: 4 }}>
        <IconArrowLeft size={14} /> Back to collections
      </Anchor>

      {armyCollection && (
        <Stack gap={4}>
          {isEditingCollectionName ? (
            <Group gap={4} wrap="nowrap">
              <TextInput
                autoFocus
                value={collectionNameDraft}
                onChange={(e) => setCollectionNameDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEditingCollectionName();
                  if (e.key === "Escape") setIsEditingCollectionName(false);
                }}
                disabled={savingCollectionName}
                style={{ flex: 1, maxWidth: 400 }}
              />
              <ActionIcon
                variant="subtle"
                color="green"
                onClick={commitEditingCollectionName}
                disabled={savingCollectionName}
                loading={savingCollectionName}
                aria-label="Save collection name"
              >
                <IconCheck size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setIsEditingCollectionName(false)}
                disabled={savingCollectionName}
                aria-label="Cancel editing collection name"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <Group gap={4} wrap="nowrap">
              <Title order={2}>{armyCollection.name}</Title>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={startEditingCollectionName}
                aria-label="Rename collection"
                title="Rename collection"
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Group>
          )}

          {isEditingCollectionDescription ? (
            <Group gap={4} wrap="nowrap" align="flex-start">
              <Textarea
                autoFocus
                autosize
                minRows={2}
                maxRows={4}
                value={collectionDescriptionDraft}
                onChange={(e) => setCollectionDescriptionDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setIsEditingCollectionDescription(false);
                }}
                disabled={savingCollectionDescription}
                placeholder="Description"
                style={{ flex: 1, maxWidth: 500 }}
              />
              <ActionIcon
                variant="subtle"
                color="green"
                onClick={commitEditingCollectionDescription}
                disabled={savingCollectionDescription}
                loading={savingCollectionDescription}
                aria-label="Save collection description"
              >
                <IconCheck size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => setIsEditingCollectionDescription(false)}
                disabled={savingCollectionDescription}
                aria-label="Cancel editing collection description"
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <Group gap={4} wrap="nowrap">
              <Text c="dimmed" fs={armyCollection.description ? undefined : "italic"}>
                {armyCollection.description || "No description"}
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={startEditingCollectionDescription}
                aria-label="Edit description"
                title="Edit description"
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Group>
          )}
        </Stack>
      )}

      <Title order={3}>Collection models</Title>

      {isAuthenticated && (
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

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated ? (
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          Sign in with Google (top right) to view and manage this collection.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : (
        <>
          {modelDefinitions.length === 0 ? (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              No model types are defined yet.
            </Alert>
          ) : (
            isEditMode && (
              <form onSubmit={handleAddModel}>
                <Stack gap="xs">
                  <Group align="flex-end" wrap="wrap">
                    <Select
                      label="Model type"
                      data={modelDefinitions.map((md) => ({ value: md.id ?? "", label: md.name ?? "" }))}
                      value={modelDefinitionId}
                      onChange={setModelDefinitionId}
                      required
                      w={180}
                    />
                    <NumberInput
                      label="Count"
                      value={count}
                      onChange={setCount}
                      min={1}
                      max={500}
                      w={100}
                    />
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
                    <Button type="submit" leftSection={<IconPlus size={16} />} loading={adding}>
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

          {models.length === 0 ? (
            <Text c="dimmed">No models added to this collection yet.</Text>
          ) : (
            <>
              <Group justify="space-between" wrap="wrap">
                <Group gap="xs" wrap="wrap">
                  <Text size="sm" c="dimmed">
                    {isEditMode
                      ? selectedModelIds.size > 0
                        ? `${selectedModelIds.size} selected`
                        : "Select models to bulk delete"
                      : (() => {
                          const shownCount = groupedModels.reduce((sum, g) => sum + g.models.length, 0);
                          return statusFilter.length > 0
                            ? `${shownCount} of ${models.length} model${models.length === 1 ? "" : "s"}`
                            : `${shownCount} model${shownCount === 1 ? "" : "s"}`;
                        })()}
                  </Text>
                  {!isEditMode &&
                    statusCounts.map(({ status, count }) => {
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
                    data={SORT_OPTIONS}
                    value={sortOrder}
                    onChange={(value) => value && setSortOrder(value as SortOrder)}
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
                      onClick={requestBulkDelete}
                      disabled={selectedModelIds.size === 0}
                    >
                      Delete selected
                    </Button>
                  )}
                </Group>
              </Group>
              <DndContext
                sensors={groupDragSensors}
                collisionDetection={closestCenter}
                onDragStart={handleGroupDragStart}
                onDragEnd={handleGroupDragEnd}
                onDragCancel={() => setDraggingGroupKey(null)}
              >
                <SortableContext items={groupedModels.map((g) => g.key)} strategy={verticalListSortingStrategy}>
                  <Accordion multiple defaultValue={groupedModels.map((g) => g.key)} variant="separated">
                    {groupedModels.map((group) => {
                      const selectedInGroup = group.models.filter((m) => m.id && selectedModelIds.has(m.id)).length;
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
                              {!draggingGroupKey && (
                              <Accordion.Panel>
                                <Stack gap="xs">
                                  {isEditMode && (
                                    <Checkbox
                                      label="Select all in this group"
                                      checked={selectedInGroup === group.models.length}
                                      indeterminate={selectedInGroup > 0 && selectedInGroup < group.models.length}
                                      onChange={(e) => toggleGroupSelected(group, e.currentTarget.checked)}
                                    />
                                  )}
                                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                                    {group.models.map((m) => (
                                      <ModelCard
                                        key={m.id}
                                        model={m}
                                        editMode={isEditMode}
                                        onUploadImage={(file) => m.id && handleUploadImage(m.id, file)}
                                        onDeleteImage={(imageId) => m.id && handleDeleteImage(m.id, imageId)}
                                        onRename={(newName) => m.id && handleRenameModel(m.id, newName)}
                                        onDeleteModel={() => m.id && requestDeleteModel(m.id)}
                                        onUpdateFinishedOn={(finishedOn) => m.id && handleUpdateFinishedOn(m.id, finishedOn)}
                                        onUpdateDescription={(description) =>
                                          m.id && handleUpdateDescription(m.id, description)
                                        }
                                        onUpdateWargearSelection={(attachmentSlotId, wargearOptionId) =>
                                          handleUpdateWargearSelection(m, attachmentSlotId, wargearOptionId)
                                        }
                                        onUpdateStatus={(status) =>
                                          m.id && handleUpdateStatus(m.id, status as CollectionModelStatus)
                                        }
                                        isUploading={uploadingModelId === m.id}
                                        deletingImageId={deletingImageId}
                                        isRenaming={renamingModelId === m.id}
                                        isDeleting={deletingModelId === m.id}
                                        isUpdatingFinishedOn={updatingFinishedOnModelId === m.id}
                                        isUpdatingDescription={updatingDescriptionModelId === m.id}
                                        isUpdatingStatus={updatingStatusModelId === m.id}
                                        updatingWargearSlotId={
                                          updatingWargearSlotKey?.startsWith(`${m.id}:`)
                                            ? updatingWargearSlotKey.slice(`${m.id}:`.length)
                                            : null
                                        }
                                        selected={!!m.id && selectedModelIds.has(m.id)}
                                        onToggleSelected={(isSelected) => m.id && toggleSelected(m.id, isSelected)}
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
                  {draggingGroupKey &&
                    (() => {
                      const draggedGroup = groupedModels.find((g) => g.key === draggingGroupKey);
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
        opened={confirmOpened}
        onClose={() => {
          setPendingDelete(null);
          closeConfirm();
        }}
        title={pendingDelete?.mode === "bulk" ? "Delete selected models?" : "Delete model?"}
      >
        <Stack gap="md">
          <Text size="sm">
            {pendingDelete?.mode === "bulk"
              ? `This will permanently delete ${selectedModelIds.size} model(s) and their images. This cannot be undone.`
              : "This will permanently delete this model and its images. This cannot be undone."}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setPendingDelete(null);
                closeConfirm();
              }}
            >
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete} loading={bulkDeleting || deletingModelId !== null}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
