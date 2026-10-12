import { Button, Collapse, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { CollectionModel, CollectionModelStatusEvent } from "@/generated";
import { COLLECTION_MODEL_STATUS_LABELS } from "@/utils/collectionModelStatus.ts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats an ISO timestamp as a UTC clock time, which is how status changes are recorded. */
export function formatStatusChangedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}, ${hours}:${minutes} UTC`;
}

function historyOf(model: CollectionModel): CollectionModelStatusEvent[] {
  return model.statusHistory ?? [];
}

export function StatusHistory({ model }: Readonly<{ model: CollectionModel }>) {
  const [opened, setOpened] = useState(false);
  const history = historyOf(model);
  const latest = model.statusChangedAt ?? history[0]?.changedAt;
  if (!latest) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }

  return (
    <Stack gap={2} onClick={(event) => event.stopPropagation()}>
      <Button
        variant="subtle"
        size="compact-xs"
        px={0}
        c="inherit"
        fw={400}
        aria-expanded={opened}
        onClick={() => setOpened((current) => !current)}
      >
        {formatStatusChangedAt(latest)}
      </Button>
      <Collapse expanded={opened}>
        <Stack gap={2}>
          {history.map((event) => (
            <Text key={`${event.status}-${event.changedAt}`} size="xs">
              {event.status ? COLLECTION_MODEL_STATUS_LABELS[event.status] : "Unknown"}
              {event.changedAt ? ` · ${formatStatusChangedAt(event.changedAt)}` : ""}
            </Text>
          ))}
        </Stack>
      </Collapse>
    </Stack>
  );
}
