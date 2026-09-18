import { Badge, Group, Table, Text } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import DefaultLoadoutWarning from "@/components/modeldefinitions/DefaultLoadoutWarning.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { AttachmentSlot, WargearOption } from "@/generated";
import defaultOccupancySlotIds from "@/utils/modeldefinitions/defaultOccupancySlotIds.ts";

type ModelDefinitionSlotTableProps = Readonly<{
  attachmentSlots: AttachmentSlot[];
  wargearOptions: WargearOption[];
}>;

function defaultBadgeTitle(option: WargearOption, slotId: string): string | undefined {
  if (!defaultOccupancySlotIds(option).includes(slotId)) {
    return undefined;
  }
  return option.isDefaultLinked ? "Default, one item in these slots" : "Default";
}

function WargearBadges({ slotId, options }: Readonly<{ slotId: string; options: WargearOption[] }>) {
  if (options.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        None
      </Text>
    );
  }

  return (
    <Group gap={4}>
      {options.map((option) => {
        const isDefaultHere = defaultOccupancySlotIds(option).includes(slotId);
        return (
          <Badge
            key={option.id}
            variant={isDefaultHere ? "filled" : "light"}
            size="sm"
            leftSection={isDefaultHere && option.isDefaultLinked ? <IconLink size={12} /> : undefined}
            title={defaultBadgeTitle(option, slotId)}
          >
            {option.name}
          </Badge>
        );
      })}
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
                  slotId={slot.id ?? ""}
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
