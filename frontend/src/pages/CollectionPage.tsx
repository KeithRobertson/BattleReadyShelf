import {
  Alert,
  Anchor,
  Button,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconArrowLeft, IconPlus, IconTrash } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import ModelCard from "../components/ModelCard";
import type { CollectionModel, ModelDefinition } from "../generated";
import {
  bulkCreateCollectionModels,
  bulkDeleteCollectionModels,
  createCollectionModel,
  createCollectionModelImageUploadUrl,
  deleteCollectionModel,
  deleteCollectionModelImage,
  getCollectionModels,
  getModelDefinitions,
  updateCollectionModel,
} from "../generated";
import { createImageVariants } from "../utils/imageVariants";

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [models, setModels] = useState<CollectionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelDefinitionId, setModelDefinitionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState<number | string>(1);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [renamingModelId, setRenamingModelId] = useState<string | null>(null);
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set());
  const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false);
  const [pendingDelete, setPendingDelete] = useState<{ mode: "single" | "bulk"; modelId?: string } | null>(null);

  useEffect(() => {
    if (!collectionId || !isAuthenticated) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    Promise.all([
      getModelDefinitions({ signal: ac.signal }),
      getCollectionModels({ path: { armyCollectionId: collectionId }, signal: ac.signal }),
    ])
      .then(([modelDefinitionsRes, modelsRes]) => {
        if (ac.signal.aborted) return;
        setModelDefinitions(modelDefinitionsRes.data ?? []);
        setModels(modelsRes.data ?? []);
        if ((modelDefinitionsRes.data?.length ?? 0) > 0) {
          setModelDefinitionId(modelDefinitionsRes.data?.[0]?.id ?? null);
        }
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [collectionId, isAuthenticated]);

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

  async function handleUploadImage(modelId: string, file: File) {
    setError(null);
    setUploadingModelId(modelId);
    try {
      const variants = await createImageVariants(file);
      const created = (
        await createCollectionModelImageUploadUrl({
          path: { collectionModelId: modelId },
          body: {
            original: { contentType: variants.original.type, contentLengthBytes: variants.original.size },
            large: { contentType: variants.large.type, contentLengthBytes: variants.large.size },
            thumbnail: { contentType: variants.thumbnail.type, contentLengthBytes: variants.thumbnail.size },
          },
        })
      ).data;
      if (!created) {
        throw new Error("Failed to request upload URL");
      }
      const uploads = [
        { url: created.uploadUrls.original, body: variants.original, contentType: variants.original.type },
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

  return (
    <Stack gap="md">
      <Anchor component={Link} to="/" size="sm" display="inline-flex" style={{ alignItems: "center", gap: 4 }}>
        <IconArrowLeft size={14} /> Back to collections
      </Anchor>

      <Title order={2}>Collection models</Title>

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
          )}

          {models.length === 0 ? (
            <Text c="dimmed">No models added to this collection yet.</Text>
          ) : (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  {selectedModelIds.size > 0 ? `${selectedModelIds.size} selected` : "Select models to bulk delete"}
                </Text>
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
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {models.map((m) => (
                  <ModelCard
                    key={m.id}
                    model={m}
                    onUploadImage={(file) => m.id && handleUploadImage(m.id, file)}
                    onDeleteImage={(imageId) => m.id && handleDeleteImage(m.id, imageId)}
                    onRename={(newName) => m.id && handleRenameModel(m.id, newName)}
                    onDeleteModel={() => m.id && requestDeleteModel(m.id)}
                    isUploading={uploadingModelId === m.id}
                    deletingImageId={deletingImageId}
                    isRenaming={renamingModelId === m.id}
                    isDeleting={deletingModelId === m.id}
                    selected={!!m.id && selectedModelIds.has(m.id)}
                    onToggleSelected={(isSelected) => m.id && toggleSelected(m.id, isSelected)}
                  />
                ))}
              </SimpleGrid>
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
