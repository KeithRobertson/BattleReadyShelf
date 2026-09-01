import { ActionIcon, Badge, Group, Loader, Select, Stack, TextInput } from "@mantine/core";
import { IconCheck, IconPencil } from "@tabler/icons-react";
import React from "react";
import type { AttachmentSlot, CollectionModel, WargearOption } from "@/generated";

export type ModelCardWargearProps = Readonly<{
  model: CollectionModel;
  editMode: boolean;
  wargearOptions: WargearOption[];
  attachmentSlots: AttachmentSlot[];
  customWargearModeBySlot: Record<string, boolean>;
  customLabelDraftsBySlot: Record<string, string>;
  isEditingWargear: boolean;
  updatingWargearSlotId: string | null;
  commitWargear: (slotId: string, update: { wargearOptionId?: string | null; customLabel?: string | null }) => void;
  setCustomWargearModeBySlot: (customWargearModeBySlot: Record<string, boolean>) => void;
  setCustomLabelDraftsBySlot: (customLabelDraftsBySlot: Record<string, string>) => void;
  setIsEditingWargear: (isEditingWargear: boolean) => void;
}>;

const CUSTOM_WARGEAR_VALUE = "__custom__";

function wargearBadgeColor(optionName: string | undefined, customLabel: string | null | undefined): string {
  if (optionName) return "blue";
  if (customLabel) return "grape";
  return "gray";
}

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
  return (
    attachmentSlots.length > 0 &&
    (isEditingWargear ? (
      <Stack gap={4} align="flex-end" style={{ width: "100%" }}>
        {attachmentSlots.map((slot) => {
          const slotOptions = wargearOptions.filter((option) => option.attachmentSlotIds?.includes(slot.id ?? ""));
          const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
          const isUpdatingThisSlot = updatingWargearSlotId === slot.id;
          const slotId = slot.id ?? "";
          const isCustom = customWargearModeBySlot[slotId] ?? !!currentSelection?.customLabel;
          const selectData = [
            ...slotOptions.map((option) => ({ value: option.id ?? "", label: option.name ?? "" })),
            { value: CUSTOM_WARGEAR_VALUE, label: "Custom..." },
          ];
          const selectValue = isCustom ? CUSTOM_WARGEAR_VALUE : (currentSelection?.wargearOptionId ?? null);

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
                data={selectData}
                value={selectValue}
                onChange={(value) => {
                  if (!slotId) return;
                  if (value === CUSTOM_WARGEAR_VALUE) {
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
                  commitWargear(slotId, { wargearOptionId: value, customLabel: null });
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
          {attachmentSlots.map((slot) => {
            const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
            const optionName = wargearOptions.find((option) => option.id === currentSelection?.wargearOptionId)?.name;
            const displayLabel = optionName ?? currentSelection?.customLabel;
            return (
              <Badge
                key={slot.id}
                variant="light"
                color={wargearBadgeColor(optionName, currentSelection?.customLabel)}
                size="sm"
                title={currentSelection?.customLabel ? "Custom..." : undefined}
              >
                {slot.name}: {displayLabel ?? "Unassigned"}
              </Badge>
            );
          })}
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
