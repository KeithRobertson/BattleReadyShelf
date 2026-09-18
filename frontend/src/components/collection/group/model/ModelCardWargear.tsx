import { ActionIcon, Group, Loader, Select, Stack, TextInput } from "@mantine/core";
import { IconCheck, IconPencil } from "@tabler/icons-react";
import React from "react";
import { WargearLoadoutBadge } from "@/components/collection/WargearLoadoutBadge.tsx";
import type { AttachmentSlot, CollectionModel, WargearOption } from "@/generated";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";
import loadoutDisplayItems from "@/utils/collection/loadoutDisplayItems.ts";
import {
  CUSTOM_WARGEAR_VALUE,
  linkedPartnerTitle,
  pickerValueToUpdate,
  wargearPickerData,
  wargearPickerValue,
} from "@/utils/collection/wargearSlotPicker.ts";

export type ModelCardWargearProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
  wargearOptions: WargearOption[];
  attachmentSlots: AttachmentSlot[];
  customWargearModeBySlot: Record<string, boolean>;
  customLabelDraftsBySlot: Record<string, string>;
  isEditingWargear: boolean;
  updatingWargearSlotId: string | null;
  commitWargear: (slotId: string, update: WargearSlotUpdate) => void;
  setCustomWargearModeBySlot: (customWargearModeBySlot: Record<string, boolean>) => void;
  setCustomLabelDraftsBySlot: (customLabelDraftsBySlot: Record<string, string>) => void;
  setIsEditingWargear: (isEditingWargear: boolean) => void;
}>;

export const ModelCardWargear = React.memo(function ModelCardWargear({
  model,
  editMode,
  wargearOptions,
  attachmentSlots,
  customWargearModeBySlot,
  customLabelDraftsBySlot,
  isEditingWargear,
  updatingWargearSlotId,
  commitWargear,
  setCustomWargearModeBySlot,
  setCustomLabelDraftsBySlot,
  setIsEditingWargear,
}: ModelCardWargearProps) {
  const slotOrder = attachmentSlots.map((slot) => slot.id).filter((id): id is string => Boolean(id));

  return (
    attachmentSlots.length > 0 &&
    (isEditingWargear ? (
      <Stack gap={4} align="flex-end" style={{ width: "100%" }}>
        {attachmentSlots.map((slot) => {
          const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
          const isUpdatingThisSlot = updatingWargearSlotId === slot.id;
          const slotId = slot.id ?? "";
          const pickerValue = wargearPickerValue(slotId, slotOrder, model);
          const isCustom = customWargearModeBySlot[slotId] ?? pickerValue === CUSTOM_WARGEAR_VALUE;
          const selectValue = isCustom ? CUSTOM_WARGEAR_VALUE : pickerValue;

          function commitCustomLabel() {
            const label = (customLabelDraftsBySlot[slotId] ?? "").trim();
            commitWargear(slotId, {
              wargearOptionId: null,
              customLabel: label.length > 0 ? label : null,
            });
          }

          return (
            <Stack key={slot.id} gap={2} style={{ width: "100%" }}>
              <Select
                size="xs"
                label={slot.name}
                placeholder="Unassigned"
                clearable
                description={linkedPartnerTitle(slotId, attachmentSlots, model)}
                data={wargearPickerData(slotId, attachmentSlots, wargearOptions, model)}
                value={selectValue}
                onChange={(value) => {
                  if (!slotId) return;
                  const update = pickerValueToUpdate(value);
                  if (update === "custom") {
                    setCustomWargearModeBySlot({
                      ...customWargearModeBySlot,
                      [slotId]: true,
                    });
                    setCustomLabelDraftsBySlot({
                      ...customLabelDraftsBySlot,
                      [slotId]: currentSelection?.customLabel ?? "",
                    });
                    return;
                  }
                  setCustomWargearModeBySlot({
                    ...customWargearModeBySlot,
                    [slotId]: false,
                  });
                  commitWargear(slotId, update);
                }}
                disabled={isUpdatingThisSlot}
                rightSection={isUpdatingThisSlot ? <Loader size={12} /> : undefined}
                style={{ width: "100%" }}
              />
              {isCustom && (
                <TextInput
                  size="xs"
                  placeholder="Describe the wargear you modeled"
                  value={customLabelDraftsBySlot[slotId] ?? currentSelection?.customLabel ?? ""}
                  onChange={(e) => {
                    const newValue = e.currentTarget.value;
                    setCustomLabelDraftsBySlot({
                      ...customLabelDraftsBySlot,
                      [slotId]: newValue,
                    });
                  }}
                  onBlur={commitCustomLabel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCustomLabel();
                  }}
                  disabled={isUpdatingThisSlot}
                />
              )}
            </Stack>
          );
        })}
        <Group gap={4} justify="flex-end">
          <ActionIcon size="sm" variant="subtle" title="Done" onClick={() => setIsEditingWargear(false)}>
            <IconCheck size={14} />
          </ActionIcon>
        </Group>
      </Stack>
    ) : (
      <Group gap={4} wrap="nowrap" justify="flex-end" style={{ width: "100%" }}>
        <Group gap={4} justify="flex-end" wrap="wrap" style={{ flex: 1 }}>
          {loadoutDisplayItems(attachmentSlots, model, wargearOptions).map((item) => (
            <WargearLoadoutBadge key={item.key} item={item} />
          ))}
        </Group>
        {editMode && (
          <ActionIcon size="sm" variant="subtle" title="Edit loadout" onClick={() => setIsEditingWargear(true)}>
            <IconPencil size={12} />
          </ActionIcon>
        )}
      </Group>
    ))
  );
});
