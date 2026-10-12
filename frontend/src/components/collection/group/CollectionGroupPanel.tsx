import { Accordion, Checkbox, Stack, Table } from "@mantine/core";
import React, { useMemo } from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { ModelRow } from "@/components/collection/group/model/ModelRow.tsx";
import GroupPaintRecipe from "@/components/collection/paint/GroupPaintRecipe.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { ModelGroup } from "@/hooks/collections/useGroupedModels.ts";
import { useAppAside } from "@/hooks/useAsideContent.ts";
import getSelectedInGroup from "@/utils/collection/getSelectedInGroup.ts";

export type CollectionGroupPanelProps = Readonly<{
  group: ModelGroup;
}>;

export const CollectionGroupPanel = React.memo(function CollectionGroupPanel({ group }: CollectionGroupPanelProps) {
  const { isEditMode, selection, focus, paintRecipes } = useCollectionContext();
  const { openAside } = useAppAside();
  const selectedInGroup = useMemo(
    () => getSelectedInGroup(group, selection.selectedModelIds),
    [group, selection.selectedModelIds],
  );

  function handleToggleFocus(modelId: string | undefined) {
    if (!modelId) return;
    if (focus.focusedModelId === modelId) {
      focus.clearFocus();
      return;
    }
    focus.setFocus(modelId);
    openAside();
  }

  return (
    <Accordion.Panel>
      <Stack gap="xs">
        <GroupPaintRecipe group={group} />

        {isEditMode && (
          <Checkbox
            label="Select all in this group"
            checked={selectedInGroup === group.models.length}
            indeterminate={selectedInGroup > 0 && selectedInGroup < group.models.length}
            onChange={(event) => selection.toggleGroupSelected(group, event.currentTarget.checked)}
          />
        )}

        <ResponsiveTable highlightOnHover verticalSpacing="xs" fitOnMobile minWidth={720}>
          <Table.Thead>
            <Table.Tr>
              {isEditMode && <Table.Th w={40} />}
              <Table.Th>Model</Table.Th>
              <Table.Th visibleFrom="sm">Status</Table.Th>
              <Table.Th visibleFrom="sm">Loadout</Table.Th>
              <Table.Th visibleFrom="sm">Paints</Table.Th>
              <Table.Th visibleFrom="md">Changed</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {group.models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                editMode={isEditMode}
                selected={!!model.id && selection.selectedModelIds.has(model.id)}
                focused={focus.isFocused(model.id)}
                recipe={paintRecipes.recipeFor({ scope: "MODEL", collectionModelId: model.id })}
                onToggleSelected={(isSelected) => {
                  if (model.id) selection.toggleSelected(model.id, isSelected);
                }}
                onToggleFocus={() => handleToggleFocus(model.id)}
              />
            ))}
          </Table.Tbody>
        </ResponsiveTable>
      </Stack>
    </Accordion.Panel>
  );
});
