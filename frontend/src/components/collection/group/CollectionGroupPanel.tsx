import { Accordion, Checkbox, Stack, Table, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
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

type ColumnShare = {
  model: number;
  status: number;
  loadout: number;
  paints: number;
  changed: number;
};

// Every group uses the same shares, so Paints starts at the same x. Hidden columns are 0 because
// `visibleFrom` removes them; the checkbox is a fixed width taken out before the shares.
const DESKTOP_COLUMNS: ColumnShare = { model: 26, status: 12, loadout: 28, paints: 14, changed: 20 };
const TABLET_COLUMNS: ColumnShare = { model: 34, status: 14, loadout: 32, paints: 20, changed: 0 };
const PHONE_COLUMNS: ColumnShare = { model: 100, status: 0, loadout: 0, paints: 0, changed: 0 };
const CHECKBOX_COLUMN = "2.5rem";

function columnsFor(isMobile: boolean, isBelowMd: boolean): ColumnShare {
  if (isMobile) return PHONE_COLUMNS;
  if (isBelowMd) return TABLET_COLUMNS;
  return DESKTOP_COLUMNS;
}

function columnWidth(percent: number, editMode: boolean): string {
  if (percent <= 0) return "0px";
  if (!editMode) return `${percent}%`;
  return `calc((100% - ${CHECKBOX_COLUMN}) * ${percent / 100})`;
}

export const CollectionGroupPanel = React.memo(function CollectionGroupPanel({ group }: CollectionGroupPanelProps) {
  const { isEditMode, selection, focus, paintRecipes } = useCollectionContext();
  const { openAside } = useAppAside();
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`, false, { getInitialValueInEffect: false });
  const isBelowMd = useMediaQuery(`(max-width: ${theme.breakpoints.md})`, false, { getInitialValueInEffect: false });
  const columns = columnsFor(isMobile, isBelowMd);
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

        <ResponsiveTable
          highlightOnHover
          verticalSpacing="xs"
          fitOnMobile
          minWidth={720}
          layout="fixed"
          style={{ verticalAlign: "top" }}
        >
          <colgroup>
            {isEditMode && <col style={{ width: CHECKBOX_COLUMN }} />}
            <col style={{ width: columnWidth(columns.model, isEditMode) }} />
            <col style={{ width: columnWidth(columns.status, isEditMode) }} />
            <col style={{ width: columnWidth(columns.loadout, isEditMode) }} />
            <col style={{ width: columnWidth(columns.paints, isEditMode) }} />
            <col style={{ width: columnWidth(columns.changed, isEditMode) }} />
          </colgroup>
          <Table.Thead>
            <Table.Tr>
              {isEditMode && <Table.Th />}
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
