import { Badge, Group, Table, Text } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import DefaultLoadoutWarning from "@/components/modeldefinitions/DefaultLoadoutWarning.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { AttachmentSlot, WargearOption } from "@/generated";

type ModelDefinitionSlotTableProps = Readonly<{
  attachmentSlots: AttachmentSlot[];
  wargearOptions: WargearOption[];
}>;

function defaultBadgeTitle(option: WargearOption): string | undefined {
  if (!option.isDefault) {
    return undefined;
  }
  return option.isDefaultLinked ? "Default, one item in these slots" : "Default";
}

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
          leftSection={option.isDefault && option.isDefaultLinked ? <IconLink size={12} /> : undefined}
          title={defaultBadgeTitle(option)}
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
    <>
      <DefaultLoadoutWarning slots={attachmentSlots} options={wargearOptions} />
      <ResponsiveTable striped withTableBorder verticalSpacing="xs" minWidth={360}>
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
      </ResponsiveTable>
    </>
  );
}
