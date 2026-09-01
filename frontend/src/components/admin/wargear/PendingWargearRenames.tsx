import { Alert, Button, Card, Group, Stack, Table, Text, Title } from "@mantine/core";
import { IconArrowRight, IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import type { WargearDefinitionDraft } from "@/generated";

type PendingWargearRenamesProps = Readonly<{
  drafts: WargearDefinitionDraft[];
  busyDraftId: string | null;
  onAccept: (draft: WargearDefinitionDraft) => void;
  onReject: (draft: WargearDefinitionDraft) => void;
}>;

function UsageText({ usageCount }: Readonly<{ usageCount: number }>) {
  if (usageCount === 0) {
    return (
      <Text size="sm" c="dimmed">
        Unused
      </Text>
    );
  }
  return <Text size="sm">{usageCount === 1 ? "1 model" : `${usageCount} models`}</Text>;
}

/**
 * Renames proposed by an import and waiting on a decision. An import never renames shared wargear
 * on its own, because one definition backs every model that carries the item.
 */
export default function PendingWargearRenames({
  drafts,
  busyDraftId,
  onAccept,
  onReject,
}: PendingWargearRenamesProps) {
  if (drafts.length === 0) return null;

  return (
    <Card withBorder padding="md">
      <Stack gap="sm">
        <div>
          <Title order={4}>Proposed renames</Title>
          <Text size="sm" c="dimmed">
            The last import wanted to rename these, but shared wargear is never renamed automatically. Accepting one
            applies the new name everywhere it is used.
          </Text>
        </div>

        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          Rejecting keeps the current name. A later import of the same data will propose it again.
        </Alert>

        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Current name</Table.Th>
              <Table.Th />
              <Table.Th>Proposed name</Table.Th>
              <Table.Th>Dataset Id</Table.Th>
              <Table.Th>Used by</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {drafts.map((draft) => (
              <Table.Tr key={draft.id}>
                <Table.Td>
                  <Text size="sm" c="dimmed" td="line-through">
                    {draft.currentName}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <IconArrowRight size={16} />
                </Table.Td>
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {draft.proposedName}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" ff="monospace">
                    {draft.externalId ?? "-"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <UsageText usageCount={draft.usageCount ?? 0} />
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" wrap="nowrap" justify="flex-end">
                    <Button
                      size="xs"
                      variant="light"
                      leftSection={<IconCheck size={14} />}
                      loading={busyDraftId === draft.id}
                      onClick={() => onAccept(draft)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="gray"
                      leftSection={<IconX size={14} />}
                      disabled={busyDraftId === draft.id}
                      onClick={() => onReject(draft)}
                    >
                      Reject
                    </Button>
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
