import { Badge, Group, Table, Text } from "@mantine/core";
import type { AttachmentSlot, WargearOption } from "@/generated";

type ModelDefinitionSlotTableProps = Readonly<{
  attachmentSlots: AttachmentSlot[];
  wargearOptions: WargearOption[];
}>;

function WargearBadges({ options }: Readonly<{ options: WargearOption[] }>) {
  if (options.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        None
      </Text>
    );
  }

  return (
    <Group gap={4}>
      {options.map((option) => (
        <Badge
          key={option.id}
          variant={option.isDefault ? "filled" : "light"}
          size="sm"
          title={option.isDefault ? "Default" : undefined}
        >
          {option.name}
        </Badge>
      ))}
    </Group>
  );
}

/** Read-only view of a published model definition's attachment slots and the wargear filling them. */
export default function ModelDefinitionSlotTable({ attachmentSlots, wargearOptions }: ModelDefinitionSlotTableProps) {
  if (attachmentSlots.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        No attachment slots defined for this model.
      </Text>
    );
  }

  return (
    <Table striped withTableBorder verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Attachment slot</Table.Th>
          <Table.Th>Wargear options</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {attachmentSlots.map((slot) => (
          <Table.Tr key={slot.id}>
            <Table.Td>{slot.name}</Table.Td>
            <Table.Td>
              <WargearBadges
                options={wargearOptions.filter((option) => option.attachmentSlotIds?.includes(slot.id ?? ""))}
              />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
