import { Accordion, ActionIcon, Badge, Group, Text } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import React, { useMemo } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import type { DragProps } from "@/components/collection/group/CollectionGroup.tsx";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";
import getSelectedInGroup from "@/utils/collection/getSelectedInGroup.ts";

export const CollectionGroupHeader = React.memo(function CollectionGroupHeader({
  group,
  dragProps,
}: Readonly<{
  group: ModelGroup;
  dragProps: DragProps;
}>) {
  const { isEditMode, selection } = useCollectionContext();
  const selectedInGroup = useMemo(
    () => getSelectedInGroup(group, selection.selectedModelIds),
    [group, selection.selectedModelIds],
  );

  return (
    <Accordion.Control>
      <Group justify="space-between" wrap="nowrap" pr="sm">
        <Group gap="xs">
          {isEditMode && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              style={{ cursor: "grab", touchAction: "none" }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Drag to reorder"
              {...dragProps.attributes}
              {...dragProps.listeners}
            >
              <IconGripVertical size={16} />
            </ActionIcon>
          )}

          <Text fw={500}>{group.label}</Text>
          <Badge variant="light">{group.models.length}</Badge>
        </Group>

        {isEditMode && selectedInGroup > 0 && (
          <Badge color="red" variant="light">
            {selectedInGroup} selected
          </Badge>
        )}
      </Group>
    </Accordion.Control>
  );
});
