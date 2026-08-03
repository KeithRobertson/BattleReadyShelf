import { Alert, Anchor, Button, Group, Loader, Select, SimpleGrid, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconArrowLeft, IconPlus } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import ModelCard from "../components/ModelCard";
import type { CollectionModel, ModelDefinition } from "../generated";
import {
  createCollectionModel,
  createCollectionModelImageUploadUrl,
  deleteCollectionModelImage,
  getCollectionModels,
  getModelDefinitions,
} from "../generated";

export default function CollectionPage() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [models, setModels] = useState<CollectionModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modelDefinitionId, setModelDefinitionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadingModelId, setUploadingModelId] = useState<string | null>(null);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

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
    try {
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
      setName("");
      setDescription("");
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleUploadImage(modelId: string, file: File) {
    setError(null);
    setUploadingModelId(modelId);
    try {
      const created = (
        await createCollectionModelImageUploadUrl({
          path: { collectionModelId: modelId },
          body: { contentType: file.type, fileName: file.name, contentLengthBytes: file.size },
        })
      ).data;
      if (!created) {
        throw new Error("Failed to request upload URL");
      }
      const putResponse = await fetch(created.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResponse.ok) {
        throw new Error(`Upload to storage failed: ${putResponse.status}`);
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
              <Group align="flex-end" wrap="wrap">
                <Select
                  label="Model type"
                  data={modelDefinitions.map((md) => ({ value: md.id ?? "", label: md.name ?? "" }))}
                  value={modelDefinitionId}
                  onChange={setModelDefinitionId}
                  required
                  w={180}
                />
                <TextInput
                  label="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  w={200}
                />
                <TextInput
                  label="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.currentTarget.value)}
                  w={240}
                />
                <Button type="submit" leftSection={<IconPlus size={16} />}>
                  Add model
                </Button>
              </Group>
            </form>
          )}

          {models.length === 0 ? (
            <Text c="dimmed">No models added to this collection yet.</Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {models.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  onUploadImage={(file) => m.id && handleUploadImage(m.id, file)}
                  onDeleteImage={(imageId) => m.id && handleDeleteImage(m.id, imageId)}
                  isUploading={uploadingModelId === m.id}
                  deletingImageId={deletingImageId}
                />
              ))}
            </SimpleGrid>
          )}
        </>
      )}
    </Stack>
  );
}
