import { Divider, Stack } from "@mantine/core";
import { IconStack2 } from "@tabler/icons-react";
import { AsideFilterRow } from "@/components/aside/AsideFilterRow.tsx";
import type { CollectionModelStatus } from "@/generated";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUSES,
} from "@/utils/collectionModelStatus.ts";

export type CollectionStatsPanelProps = Readonly<{
  totalCount: number;
  countsByStatus: Record<CollectionModelStatus, number>;
  activeStatuses?: CollectionModelStatus[];
  onStatusClick?: (status: CollectionModelStatus) => void;
  onTotalClick?: () => void;
}>;

export function CollectionStatsPanel({
  totalCount,
  countsByStatus,
  activeStatuses = [],
  onStatusClick,
  onTotalClick,
}: CollectionStatsPanelProps) {
  const statusEntries = COLLECTION_MODEL_STATUSES.map((status) => ({
    status,
    count: countsByStatus[status] ?? 0,
  }));

  function statusDot(status: CollectionModelStatus) {
    return (
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: COLLECTION_MODEL_STATUS_COLORS[status],
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <Stack gap={2} miw={200}>
      <AsideFilterRow
        label="Total"
        count={totalCount}
        onClick={onTotalClick}
        actionTitle="Clear filters"
        leading={<IconStack2 size={14} stroke={1.5} />}
      />

      <Divider my={2} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 16,
          rowGap: 2,
        }}
      >
        {statusEntries.map((entry, index) => (
          <AsideFilterRow
            key={entry.status}
            label={COLLECTION_MODEL_STATUS_LABELS[entry.status]}
            count={entry.count}
            active={activeStatuses.includes(entry.status)}
            onClick={onStatusClick && entry.count > 0 ? () => onStatusClick(entry.status) : undefined}
            leading={statusDot(entry.status)}
            fullWidth={index === 0}
          />
        ))}
      </div>
    </Stack>
  );
}
