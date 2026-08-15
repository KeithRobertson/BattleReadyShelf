import { Badge, Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconStack2 } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { ArmyCollection, CollectionModelStatus } from "../generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUSES,
} from "../utils/collectionModelStatus";

export default function CollectionCard({ collection }: { collection: ArmyCollection }) {
  const navigate = useNavigate();
  const modelCount = collection.modelCount;
  const statusEntries = COLLECTION_MODEL_STATUSES.map((status) => ({
    status,
    count: collection.modelCountsByStatus?.[status as CollectionModelStatus] ?? 0,
  })).filter((entry) => entry.count > 0);

  return (
    <UnstyledButton
      onClick={() => collection.id && navigate(`/collections/${collection.id}`)}
      style={{ display: "block", width: "100%" }}
    >
      <Card withBorder radius="md" padding="lg" shadow="sm">
        <Group justify="space-between" wrap="nowrap" align="center">
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="lg">
              {collection.name}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {collection.description || "No description"}
            </Text>
          </Stack>

          <Group gap="xl" wrap="nowrap">
            {/* Stats panel: model count today, total points etc. later */}
            <Stack gap={4} align="center" miw={80}>
              <Text fw={700} size="xl">
                {modelCount ?? "–"}
              </Text>
              <Group gap={4} wrap="nowrap">
                <IconStack2 size={14} stroke={1.5} />
                <Text size="xs" c="dimmed">
                  {modelCount === 1 ? "model" : "models"}
                </Text>
              </Group>
              {statusEntries.length > 0 && (
                <Group gap={4} wrap="wrap" justify="center">
                  {statusEntries.map(({ status, count }) => (
                    <Badge key={status} color={COLLECTION_MODEL_STATUS_COLORS[status]} variant="light" size="xs">
                      {COLLECTION_MODEL_STATUS_LABELS[status]}: {count}
                    </Badge>
                  ))}
                </Group>
              )}
            </Stack>
            <IconChevronRight size={20} stroke={1.5} />
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
