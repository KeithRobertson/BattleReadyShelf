import { Divider, Group, Stack, Text } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";
import type { CollectionModelStatus } from "@/generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUSES,
} from "@/utils/collectionModelStatus.ts";

export type CollectionStatsPanelProps = Readonly<{
  totalCount: number;
  countsByStatus: Record<CollectionModelStatus, number>;
}>;

export function CollectionStatsPanel({ totalCount, countsByStatus }: CollectionStatsPanelProps) {
  const statusEntries = COLLECTION_MODEL_STATUSES.map((status) => ({
    status,
    count: countsByStatus[status] ?? 0,
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
    <Stack gap={2} miw={200}>
      <Group justify="space-between" gap={8} wrap="nowrap">
        <Group gap={4} wrap="nowrap">
          <IconStack2 size={14} stroke={1.5} />
          <Text size="xs" c="dimmed">
            Total
          </Text>
        </Group>
        <Text fw={700} size="sm">
          {totalCount}
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
        {statusEntries.slice(1).map((entry) => renderStatusCell(entry))}
      </div>
    </Stack>
  );
}
