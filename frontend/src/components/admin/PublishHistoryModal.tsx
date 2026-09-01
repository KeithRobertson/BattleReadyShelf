import { Alert, Badge, Group, Loader, Modal, Stack, Table, Text, Timeline } from "@mantine/core";
import { IconArrowRight, IconHistory, IconInfoCircle } from "@tabler/icons-react";
import type { DefinitionPublishAudit } from "@/generated";

type PublishHistoryModalProps = Readonly<{
  opened: boolean;
  definitionName: string | null;
  entries: DefinitionPublishAudit[];
  loading: boolean;
  onClose: () => void;
}>;

type Snapshot = Record<string, unknown>;

function parseSnapshot(raw?: string): Snapshot {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Snapshot) : {};
  } catch {
    return {};
  }
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "none";
  return String(value);
}

/** Only the fields that actually moved - a snapshot pair is mostly unchanged noise otherwise. */
function changedFields(previous: Snapshot, next: Snapshot) {
  const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])];
  return keys
    .filter((key) => display(previous[key]) !== display(next[key]))
    .map((key) => ({ key, before: display(previous[key]), after: display(next[key]) }));
}

function formatWhen(publishedAt?: string) {
  if (!publishedAt) return "Unknown date";
  return new Date(publishedAt).toLocaleString();
}

function EntryChanges({ entry }: Readonly<{ entry: DefinitionPublishAudit }>) {
  const fields = changedFields(parseSnapshot(entry.previousState), parseSnapshot(entry.newState));
  if (fields.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Published with no field changes.
      </Text>
    );
  }
  return (
    <Table withRowBorders={false} verticalSpacing={2}>
      <Table.Tbody>
        {fields.map((field) => (
          <Table.Tr key={field.key}>
            <Table.Td width={110}>
              <Text size="xs" c="dimmed">
                {field.key}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm" c="dimmed" td="line-through">
                  {field.before}
                </Text>
                <IconArrowRight size={14} />
                <Text size="sm" fw={500}>
                  {field.after}
                </Text>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

function HistoryBody({ entries, loading }: Readonly<{ entries: DefinitionPublishAudit[]; loading: boolean }>) {
  if (loading) return <Loader size="sm" />;

  if (entries.length === 0) {
    return (
      <Alert color="gray" icon={<IconInfoCircle size={16} />}>
        Nothing has been published for this definition yet.
      </Alert>
    );
  }

  return (
    <Timeline active={entries.length} bulletSize={20} lineWidth={2}>
      {entries.map((entry) => (
        <Timeline.Item key={entry.id} bullet={<IconHistory size={12} />} title={formatWhen(entry.publishedAt)}>
          <Stack gap={4}>
            {entry.origin && (
              <Badge size="sm" variant="light" color={entry.origin === "IMPORT" ? "blue" : "grape"}>
                {entry.origin === "IMPORT" ? "Proposed by import" : "Edited here"}
              </Badge>
            )}
            <EntryChanges entry={entry} />
          </Stack>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}

/** What has actually been applied to a definition over time, newest first. */
export default function PublishHistoryModal({
  opened,
  definitionName,
  entries,
  loading,
  onClose,
}: PublishHistoryModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={`Publish history for "${definitionName ?? ""}"`} size="lg">
      <HistoryBody entries={entries} loading={loading} />
    </Modal>
  );
}
