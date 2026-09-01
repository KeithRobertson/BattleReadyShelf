import { Alert, Badge, Button, Group, Loader, Modal, Select, Stack, Table, Text } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import type { ChangeModelDefinitionPreview, CollectionModel, WargearRemapOutcome } from "@/generated";
import { previewModelDefinitionChange } from "@/generated";
import useCollectionMetadata from "@/hooks/collections/useCollectionMetadata.ts";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";

export type ChangeModelDefinitionModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  model: CollectionModel;
  onConfirm: (modelDefinitionId: string) => void;
}>;

const OUTCOME_LABEL: Record<WargearRemapOutcome, string> = {
  MATCHED: "Kept",
  CUSTOM: "Kept as custom",
  DROPPED: "Removed",
};

const OUTCOME_COLOR: Record<WargearRemapOutcome, string> = {
  MATCHED: "green",
  CUSTOM: "grape",
  DROPPED: "red",
};

function PreviewTable({ preview }: Readonly<{ preview: ChangeModelDefinitionPreview }>) {
  if (preview.entries.length === 0) {
    return (
      <Alert color="gray" icon={<IconInfoCircle size={16} />}>
        This model has no wargear recorded, so there is nothing to carry across.
      </Alert>
    );
  }

  return (
    <Table withTableBorder striped>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Slot</Table.Th>
          <Table.Th>Wargear</Table.Th>
          <Table.Th>Becomes</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {preview.entries.map((entry) => (
          <Table.Tr key={`${entry.slotName}-${entry.wargearName}`}>
            <Table.Td>
              {entry.slotName}
              {entry.targetSlotName && entry.targetSlotName !== entry.slotName && (
                <Text span c="dimmed" size="sm">
                  {" "}
                  → {entry.targetSlotName}
                </Text>
              )}
            </Table.Td>
            <Table.Td>{entry.wargearName}</Table.Td>
            <Table.Td>
              <Badge variant="light" color={OUTCOME_COLOR[entry.outcome]} size="sm">
                {OUTCOME_LABEL[entry.outcome]}
              </Badge>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function ChangeModelDefinitionModal({
  opened,
  onClose,
  model,
  onConfirm,
}: ChangeModelDefinitionModalProps) {
  const { collection } = useCollectionContext();
  const { modelDefinitionSelectData } = useCollectionMetadata(collection.collection?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ChangeModelDefinitionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentDefinitionId = model.modelDefinition?.id;

  useEffect(() => {
    if (!opened) {
      setSelectedId(null);
      setPreview(null);
      setError(null);
    }
  }, [opened]);

  useEffect(() => {
    if (!opened || !selectedId || !model.id) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    previewModelDefinitionChange({
      path: { collectionModelId: model.id },
      body: { modelDefinitionId: selectedId },
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;
        setPreview(response.data ?? null);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(extractErrorMessage(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [opened, selectedId, model.id]);

  // The model is already this type, so offering it would be a no-op.
  const selectData = modelDefinitionSelectData
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.value !== currentDefinitionId),
    }))
    .filter((group) => group.items.length > 0);

  const droppedCount = preview?.entries.filter((entry) => entry.outcome === "DROPPED").length ?? 0;

  return (
    <Modal opened={opened} onClose={onClose} title="Change model type" size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Currently {model.modelDefinition?.name ?? "an unknown type"}. Wargear is carried across to the new type
          wherever the slots and weapons line up.
        </Text>

        <Select
          label="New model type"
          placeholder="Pick a model type"
          searchable
          data={selectData}
          value={selectedId}
          onChange={setSelectedId}
        />

        {loading && (
          <Group gap="xs">
            <Loader size="xs" />
            <Text size="sm">Working out what would change...</Text>
          </Group>
        )}

        {error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />}>
            {error}
          </Alert>
        )}

        {!loading && !error && preview && (
          <Stack gap="xs">
            <PreviewTable preview={preview} />
            {droppedCount > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                {droppedCount === 1
                  ? "1 assignment will be removed because the new type has no matching slot."
                  : `${droppedCount} assignments will be removed because the new type has no matching slots.`}
              </Alert>
            )}
          </Stack>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedId || loading || !!error}
            color={droppedCount > 0 ? "orange" : undefined}
            onClick={() => {
              if (selectedId) onConfirm(selectedId);
              onClose();
            }}
          >
            Change type
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
