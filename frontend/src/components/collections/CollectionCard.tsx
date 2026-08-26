import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { Badge, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconGripVertical, IconUser } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { CollectionStatsPanel } from "@/components/collections/CollectionStatsPanel.tsx";
import type { ArmyCollection, CollectionModelStatus } from "@/generated";
import { COLLECTION_MODEL_STATUSES } from "@/utils/collectionModelStatus.ts";

export type CollectionCardProps = Readonly<{
  collection: ArmyCollection;
  dragHandleProps?: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners };
  showCreator?: boolean;
}>;

export default function CollectionCard({ collection, dragHandleProps, showCreator = false }: CollectionCardProps) {
  const navigate = useNavigate();
  const modelCount = collection.modelCount;
  const emptyCounts: Record<CollectionModelStatus, number> = COLLECTION_MODEL_STATUSES.reduce(
    (acc, status) => {
      acc[status] = 0;
      return acc;
    },
    {} as Record<CollectionModelStatus, number>,
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
              <CollectionStatsPanel
                totalCount={modelCount ?? 0}
                countsByStatus={
                  (collection.modelCountsByStatus ?? emptyCounts) as Record<CollectionModelStatus, number>
                }
              />
              <IconChevronRight size={20} stroke={1.5} />
            </Group>
          </Group>
        </UnstyledButton>
      </Group>
    </Card>
  );
}
