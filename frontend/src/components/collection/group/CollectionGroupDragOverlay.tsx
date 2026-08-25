import { DragOverlay } from "@dnd-kit/core";
import { Badge, Group, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import type { GroupDrag } from "@/hooks/collections/useGroupDrag.ts";
import type { GroupedModels } from "@/hooks/collections/useGroupedModels.ts";

export function CollectionGroupDragOverlay({
  drag,
  groupedModels,
}: Readonly<{
  drag: GroupDrag;
  groupedModels: GroupedModels;
}>) {
  if (!drag.draggingGroupKey) return null;

  const draggedGroup = groupedModels.groupedModels.find((g) => g.key === drag.draggingGroupKey);

  if (!draggedGroup) return null;

  return (
    <DragOverlay>
      <Group
        justify="space-between"
        wrap="nowrap"
        pr="sm"
        p="md"
        style={{
          background: "var(--mantine-color-body)",
          border: "1px solid var(--mantine-color-default-border)",
          borderRadius: "var(--mantine-radius-default)",
          boxShadow: "var(--mantine-shadow-md)",
        }}
      >
        <Group gap="xs">
          <IconGripVertical size={16} />
          <Text fw={500}>{draggedGroup.label}</Text>
          <Badge variant="light">{draggedGroup.models.length}</Badge>
        </Group>
      </Group>
    </DragOverlay>
  );
}
