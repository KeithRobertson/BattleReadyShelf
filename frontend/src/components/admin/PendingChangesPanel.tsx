import { Alert, Badge, Button, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconArrowRight, IconCheck, IconHistory, IconInfoCircle, IconX } from "@tabler/icons-react";
import type { ProposalOrigin } from "@/generated";

/** One field that would change, rendered as `before → after`. */
export type PendingFieldChange = Readonly<{
  label: string;
  before: string | null;
  after: string | null;
}>;

export type PendingChangeRow = Readonly<{
  id: string;
  /** The definition as it stands today, so a row is recognisable before any change is applied. */
  currentName: string;
  externalId?: string | null;
  origin?: ProposalOrigin;
  usageCount?: number;
  fields: PendingFieldChange[];
}>;

type PendingChangesPanelProps = Readonly<{
  title: string;
  description: string;
  /** What a usage means here - "model" for wargear, "model definition" for a faction. */
  usageNoun: string;
  rows: PendingChangeRow[];
  busyRowId: string | null;
  onAccept: (row: PendingChangeRow) => void;
  onReject: (row: PendingChangeRow) => void;
  onViewHistory?: (row: PendingChangeRow) => void;
}>;

function UsageText({ usageCount, usageNoun }: Readonly<{ usageCount: number; usageNoun: string }>) {
  if (usageCount === 0) {
    return (
      <Text size="sm" c="dimmed">
        Unused
      </Text>
    );
  }
  return <Text size="sm">{usageCount === 1 ? `1 ${usageNoun}` : `${usageCount} ${usageNoun}s`}</Text>;
}

function OriginBadge({ origin }: Readonly<{ origin?: ProposalOrigin }>) {
  if (!origin) return null;
  const isImport = origin === "IMPORT";
  return (
    <Badge size="sm" variant="light" color={isImport ? "blue" : "grape"}>
      {isImport ? "Import" : "Edited here"}
    </Badge>
  );
}

function ChangedValue({ value, struck }: Readonly<{ value: string | null; struck: boolean }>) {
  if (value === null) {
    return (
      <Text span size="sm" c="dimmed" fs="italic" td={struck ? "line-through" : undefined}>
        none
      </Text>
    );
  }
  return (
    <Text
      span
      size="sm"
      c={struck ? "dimmed" : undefined}
      fw={struck ? undefined : 500}
      td={struck ? "line-through" : undefined}
    >
      {value}
    </Text>
  );
}

function FieldChanges({ fields }: Readonly<{ fields: PendingFieldChange[] }>) {
  return (
    <Stack gap={2}>
      {fields.map((field) => (
        <Group key={field.label} gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed" w={70}>
            {field.label}
          </Text>
          <ChangedValue value={field.before} struck />
          <IconArrowRight size={14} />
          <ChangedValue value={field.after} struck={false} />
        </Group>
      ))}
    </Stack>
  );
}

/**
 * Changes staged against published definitions, waiting on a decision. Nothing here is in effect
 * yet: an import and a hand edit both land here, because a shared definition fans out across
 * everything referencing it and should not change unattended.
 */
export default function PendingChangesPanel({
  title,
  description,
  usageNoun,
  rows,
  busyRowId,
  onAccept,
  onReject,
  onViewHistory,
}: PendingChangesPanelProps) {
  if (rows.length === 0) return null;

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>{title}</Title>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </div>

        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          Rejecting keeps what is published today. A later import of the same data will propose it again.
        </Alert>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Definition</Table.Th>
              <Table.Th>Proposed changes</Table.Th>
              <Table.Th>Raised by</Table.Th>
              <Table.Th>Used by</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.id}>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {row.currentName}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {row.externalId ?? "-"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <FieldChanges fields={row.fields} />
                </Table.Td>
                <Table.Td>
                  <OriginBadge origin={row.origin} />
                </Table.Td>
                <Table.Td>
                  <UsageText usageCount={row.usageCount ?? 0} usageNoun={usageNoun} />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap" justify="flex-end">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconCheck size={14} />}
                      loading={busyRowId === row.id}
                      onClick={() => onAccept(row)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconX size={14} />}
                      disabled={busyRowId === row.id}
                      onClick={() => onReject(row)}
                    >
                      Reject
                    </Button>
                    {onViewHistory && (
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconHistory size={14} />}
                        onClick={() => onViewHistory(row)}
                      >
                        History
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Stack>
    </Card>
  );
}
