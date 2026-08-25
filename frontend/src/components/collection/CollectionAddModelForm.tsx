import { Alert, Button, Group, MultiSelect, NumberInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import type { CollectionMetadata } from "@/hooks/collections/useCollectionMetadata.ts";
import type { ModelDefinitionSelectData } from "@/pages/CollectionPage.tsx";

export function CollectionAddModelForm({
  isOwner,
  isEditMode,
  collectionId,
  collectionMetaData,
  filteredModelDefinitionSelectData,
  modelDefinitionId,
  setModelDefinitionId,
  name,
  setName,
  description,
  setDescription,
  count,
  setCount,
  factionFilter,
  setFactionFilter,
  addModel,
  loading,
}: Readonly<{
  isOwner: boolean;
  isEditMode: boolean;
  collectionId: string | undefined;
  collectionMetaData: CollectionMetadata;
  filteredModelDefinitionSelectData: ModelDefinitionSelectData;
  modelDefinitionId: string | null;
  setModelDefinitionId: (v: string | null) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  count: number | string;
  setCount: (v: number | string) => void;
  factionFilter: string[];
  setFactionFilter: (v: string[]) => void;
  addModel: (modelDefinitionId: string, name?: string, description?: string, count?: number) => void;
  loading: boolean;
}>) {
  if (!isOwner || !isEditMode) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();

    if (!collectionId || !modelDefinitionId) return;

    const requestedCount = typeof count === "number" ? count : Number.parseInt(count, 10) || 1;

    addModel(modelDefinitionId, name || undefined, description || undefined, requestedCount);

    setName("");
    setDescription("");
    setCount(1);
  };

  return (
    <>
      {collectionMetaData.modelDefinitions.length === 0 ? (
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          No model types are defined yet.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
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
                data={filteredModelDefinitionSelectData}
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

              <Button type="submit" leftSection={<IconPlus size={16} />} loading={loading}>
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
    </>
  );
}
