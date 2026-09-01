import { ActionIcon, Badge, Table, Text } from "@mantine/core";
import { IconPencil } from "@tabler/icons-react";
import type { WargearDefinition } from "@/generated";

type WargearDefinitionTableProps = Readonly<{
  definitions: WargearDefinition[];
  onRename: (definition: WargearDefinition) => void;
}>;

function SourceCell({ externalId }: Readonly<{ externalId?: string }>) {
  if (externalId == null) {
    return (
      <Badge color="grape" variant="light">
        Hand-authored
      </Badge>
    );
  }
  return (
    <Text size="sm" ff="monospace">
      {externalId}
    </Text>
  );
}

function UsageCell({ usageCount }: Readonly<{ usageCount: number }>) {
  if (usageCount === 0) {
    return (
      <Text size="sm" c="dimmed">
        Unused
      </Text>
    );
  }
  return <Text size="sm">{usageCount}</Text>;
}

export default function WargearDefinitionTable({ definitions, onRename }: WargearDefinitionTableProps) {
  return (
    <Table highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Dataset Id</Table.Th>
          <Table.Th>Used by</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {definitions.map((definition) => (
          <Table.Tr key={definition.id}>
            <Table.Td>{definition.name}</Table.Td>
            <Table.Td>
              <SourceCell externalId={definition.externalId} />
            </Table.Td>
            <Table.Td>
              <UsageCell usageCount={definition.usageCount ?? 0} />
            </Table.Td>
            <Table.Td>
              <ActionIcon variant="light" onClick={() => onRename(definition)} title="Propose a rename">
                <IconPencil size={16} />
              </ActionIcon>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
