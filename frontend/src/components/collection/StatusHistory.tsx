import { ActionIcon, Button, Collapse, Group, Stack, Text } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
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

function eventLabel(event: CollectionModelStatusEvent): string {
  const status = event.status ? COLLECTION_MODEL_STATUS_LABELS[event.status] : "Unknown";
  return event.changedAt ? `${status} · ${formatStatusChangedAt(event.changedAt)}` : status;
}

export function StatusHistory({
  model,
  onDeleteEvent,
  deletingEventId = null,
}: Readonly<{
  model: CollectionModel;
  /** Set while editing. The last remaining change has no delete control. */
  onDeleteEvent?: (eventId: string) => void;
  deletingEventId?: string | null;
}>) {
  const [opened, setOpened] = useState(false);
  const history = historyOf(model);
  const latest = model.statusChangedAt ?? history[0]?.changedAt;
  const canDelete = Boolean(onDeleteEvent) && history.length > 1;
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
      <Collapse expanded={opened} transitionDuration={0}>
        <Stack gap={2}>
          {history.map((event) => {
            const label = eventLabel(event);
            return (
              <Group
                key={event.id ?? `${event.status}-${event.changedAt}`}
                gap={4}
                wrap="nowrap"
                justify="space-between"
              >
                <Text size="xs">{label}</Text>
                {canDelete && event.id && onDeleteEvent && (
                  <ActionIcon
                    size="xs"
                    variant="subtle"
                    color="red"
                    aria-label={`Remove ${label}`}
                    loading={deletingEventId === event.id}
                    onClick={() => onDeleteEvent(event.id ?? "")}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                )}
              </Group>
            );
          })}
        </Stack>
      </Collapse>
    </Stack>
  );
}
