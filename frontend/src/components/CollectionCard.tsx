import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Badge, Card, Divider, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconGripVertical, IconStack2, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { ArmyCollection, CollectionModelStatus } from "../generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUSES,
} from "../utils/collectionModelStatus";

export default function CollectionCard({
  collection,
  dragHandleProps,
  showCreator = false,
}: {
  collection: ArmyCollection;
  /** When provided, renders a drag handle carrying these dnd-kit listeners/attributes. */
  dragHandleProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
  showCreator?: boolean;
}) {
  const navigate = useNavigate();
  const modelCount = collection.modelCount;
  const statusEntries = COLLECTION_MODEL_STATUSES.map((status) => ({
    status,
    count: collection.modelCountsByStatus?.[status as CollectionModelStatus] ?? 0,
  }));

  const renderStatusCell = (entry: (typeof statusEntries)[number], fullWidth = false) => (
    <Group
      key={entry.status}
      justify="space-between"
      gap={8}
      wrap="nowrap"
      style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}
    >
      <Group gap={6} wrap="nowrap">
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: COLLECTION_MODEL_STATUS_COLORS[entry.status],
            flexShrink: 0,
          }}
        />
        <Text size="xs" c="dimmed">
          {COLLECTION_MODEL_STATUS_LABELS[entry.status]}
        </Text>
      </Group>
      <Text size="xs" fw={600}>
        {entry.count}
      </Text>
    </Group>
  );

  return (
    <Card withBorder radius="md" padding="lg" shadow="sm">
      <Group wrap="nowrap" align="stretch" gap="sm">
        {dragHandleProps && (
          <UnstyledButton
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            style={{ cursor: "grab", display: "flex", alignItems: "center", touchAction: "none" }}
            aria-label="Drag to reorder"
          >
            <IconGripVertical size={18} stroke={1.5} />
          </UnstyledButton>
        )}
        <UnstyledButton
          onClick={() => collection.id && navigate(`/collections/${collection.id}`)}
          style={{ display: "block", flex: 1, minWidth: 0 }}
        >
          <Group justify="space-between" wrap="nowrap" align="center">
            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs" align="center" wrap="nowrap">
                <Text fw={600} size="lg" truncate>
                  {collection.name}
                </Text>
                {!showCreator && (
                  <Badge variant="light" color={collection.isPublic ? "blue" : "gray"} size="sm">
                    {collection.isPublic ? "Public" : "Private"}
                  </Badge>
                )}
              </Group>
              {showCreator && collection.userDisplayName && (
                <Group gap={4} align="center" wrap="nowrap">
                  <IconUser size={14} stroke={1.5} color="gray" />
                  <Text size="xs" c="dimmed">
                    by {collection.userDisplayName}
                  </Text>
                </Group>
              )}
              <Text size="sm" c="dimmed" lineClamp={2}>
                {collection.description || "No description"}
              </Text>
            </Stack>

            <Group gap="xl" wrap="nowrap">
              {/* Stats panel: model count today, total points etc. later */}
              <Stack gap={2} miw={200}>
                <Group justify="space-between" gap={8} wrap="nowrap">
                  <Group gap={4} wrap="nowrap">
                    <IconStack2 size={14} stroke={1.5} />
                    <Text size="xs" c="dimmed">
                      Total
                    </Text>
                  </Group>
                  <Text fw={700} size="sm">
                    {modelCount ?? "–"}
                  </Text>
                </Group>
                <Divider my={2} />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    columnGap: 16,
                    rowGap: 2,
                  }}
                >
                  {renderStatusCell(statusEntries[0], true)}
                  {renderStatusCell(statusEntries[1])}
                  {renderStatusCell(statusEntries[2])}
                  {renderStatusCell(statusEntries[3])}
                  {renderStatusCell(statusEntries[4])}
                  {renderStatusCell(statusEntries[5])}
                  {renderStatusCell(statusEntries[6])}
                </div>
              </Stack>
              <IconChevronRight size={20} stroke={1.5} />
            </Group>
          </Group>
        </UnstyledButton>
      </Group>
    </Card>
  );
}
