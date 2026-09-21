import { ActionIcon, Button, Group, Loader, MultiSelect, Select, Stack, Switch, Text, TextInput } from "@mantine/core";
import { IconCheck, IconMagnet, IconPencil } from "@tabler/icons-react";
import React from "react";
import { useCollectionContext } from "@/components/collection/context/CollectionContext.ts";
import { MagnetizedWargearScroller } from "@/components/collection/MagnetizedWargearScroller.tsx";
import { WargearLoadoutBadge } from "@/components/collection/WargearLoadoutBadge.tsx";
import type { AttachmentSlot, CollectionModel, WargearOption } from "@/generated";
import useCollectionMetadata from "@/hooks/collections/useCollectionMetadata.ts";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";
import loadoutDisplayItems from "@/utils/collection/loadoutDisplayItems.ts";
import { allWargearOptions, isMagnetized, optionsEligibleForSlot } from "@/utils/collection/modelLoadout.ts";
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
  onUpdateAlternateIdentities?: (ids: string[]) => void;
  onSwitchIdentity?: (modelDefinitionId: string) => void;
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
  onUpdateAlternateIdentities,
  onSwitchIdentity,
  setCustomWargearModeBySlot,
  setCustomLabelDraftsBySlot,
  setIsEditingWargear,
}: ModelCardWargearProps) {
  const slotOrder = attachmentSlots.map((slot) => slot.id).filter((id): id is string => Boolean(id));
  const resolvedOptions = allWargearOptions(model).length > 0 ? allWargearOptions(model) : wargearOptions;
  const { collection } = useCollectionContext();
  const { modelDefinitionSelectData } = useCollectionMetadata(collection.collection?.id);
  const currentDefinitionId = model.modelDefinitionId ?? model.modelDefinition?.id;
  const identitySelectData = modelDefinitionSelectData
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.value !== currentDefinitionId),
    }))
    .filter((group) => group.items.length > 0);
  const alternateIds = model.alternateModelDefinitionIds ?? [];
  const alternateDefinitions = model.alternateModelDefinitions ?? [];

  return (
    attachmentSlots.length > 0 &&
    (isEditingWargear ? (
      <Stack gap={6} align="stretch" style={{ width: "100%" }}>
        {alternateDefinitions.length > 0 && onSwitchIdentity && (
          <Group gap={6} wrap="wrap">
            <BadgeChip label={model.modelDefinition?.name ?? "Current"} active onClick={() => undefined} />
            {alternateDefinitions.map((definition) =>
              definition.id ? (
                <BadgeChip
                  key={definition.id}
                  label={definition.name ?? "Alternate"}
                  active={false}
                  onClick={() => onSwitchIdentity(definition.id ?? "")}
                />
              ) : null,
            )}
          </Group>
        )}
        {attachmentSlots.map((slot) => (
          <SlotLoadoutEditor
            key={slot.id}
            slot={slot}
            model={model}
            attachmentSlots={attachmentSlots}
            slotOrder={slotOrder}
            resolvedOptions={resolvedOptions}
            customWargearModeBySlot={customWargearModeBySlot}
            customLabelDraftsBySlot={customLabelDraftsBySlot}
            updatingWargearSlotId={updatingWargearSlotId}
            commitWargear={commitWargear}
            setCustomWargearModeBySlot={setCustomWargearModeBySlot}
            setCustomLabelDraftsBySlot={setCustomLabelDraftsBySlot}
          />
        ))}
        {onUpdateAlternateIdentities && (
          <MultiSelect
            size="xs"
            label="Can also be"
            placeholder="Another datasheet this miniature can represent"
            searchable
            clearable
            data={identitySelectData}
            value={alternateIds}
            onChange={onUpdateAlternateIdentities}
          />
        )}
        <Group gap={4} justify="flex-end">
          <ActionIcon size="sm" variant="subtle" title="Done" onClick={() => setIsEditingWargear(false)}>
            <IconCheck size={14} />
          </ActionIcon>
        </Group>
      </Stack>
    ) : (
      <Group gap={4} wrap="nowrap" justify="flex-end" style={{ width: "100%" }}>
        <Group gap={4} justify="flex-end" wrap="wrap" style={{ flex: 1 }}>
          {loadoutDisplayItems(attachmentSlots, model, resolvedOptions).map((item) => (
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

type SlotLoadoutEditorProps = Readonly<{
  slot: AttachmentSlot;
  model: CollectionModel;
  attachmentSlots: AttachmentSlot[];
  slotOrder: string[];
  resolvedOptions: WargearOption[];
  customWargearModeBySlot: Record<string, boolean>;
  customLabelDraftsBySlot: Record<string, string>;
  updatingWargearSlotId: string | null;
  commitWargear: (slotId: string, update: WargearSlotUpdate) => void;
  setCustomWargearModeBySlot: (customWargearModeBySlot: Record<string, boolean>) => void;
  setCustomLabelDraftsBySlot: (customLabelDraftsBySlot: Record<string, string>) => void;
}>;

function pickerSelectValue(isCustom: boolean, magnetized: boolean, pickerValue: string | null): string | null {
  if (isCustom) {
    return CUSTOM_WARGEAR_VALUE;
  }
  return magnetized ? null : pickerValue;
}

function SlotLoadoutEditor({
  slot,
  model,
  attachmentSlots,
  slotOrder,
  resolvedOptions,
  customWargearModeBySlot,
  customLabelDraftsBySlot,
  updatingWargearSlotId,
  commitWargear,
  setCustomWargearModeBySlot,
  setCustomLabelDraftsBySlot,
}: SlotLoadoutEditorProps) {
  const currentSelection = model.wargearSelections?.find((s) => s.attachmentSlotId === slot.id);
  const isUpdatingThisSlot = updatingWargearSlotId === slot.id;
  const slotId = slot.id ?? "";
  const magnetized = isMagnetized(model, slotId);
  const eligible = optionsEligibleForSlot(slot, model);
  const pickerValue = wargearPickerValue(slotId, slotOrder, model);
  const isCustom = customWargearModeBySlot[slotId] ?? (!magnetized && pickerValue === CUSTOM_WARGEAR_VALUE);
  const selectValue = pickerSelectValue(isCustom, magnetized, pickerValue);

  function commitCustomLabel() {
    const label = (customLabelDraftsBySlot[slotId] ?? "").trim();
    commitWargear(slotId, {
      wargearOptionId: null,
      customLabel: label.length > 0 ? label : null,
      addBit: magnetized,
    });
    if (magnetized) {
      setCustomWargearModeBySlot({ ...customWargearModeBySlot, [slotId]: false });
      setCustomLabelDraftsBySlot({ ...customLabelDraftsBySlot, [slotId]: "" });
    }
  }

  return (
    <Stack gap={4} style={{ width: "100%" }}>
      <Group justify="space-between" gap={6} wrap="wrap" align="center">
        <Text size="xs" fw={600}>
          {slot.name || "Slot"}
        </Text>
        <Switch
          size="xs"
          label={
            <Group gap={4} wrap="nowrap">
              <IconMagnet size={14} aria-hidden />
              Magnetised?
            </Group>
          }
          aria-label={`Magnetised? ${slot.name || "slot"}`}
          checked={magnetized}
          onChange={(event) => commitWargear(slotId, { magnetized: event.currentTarget.checked })}
          disabled={isUpdatingThisSlot}
        />
        {isUpdatingThisSlot && <Loader size={12} />}
      </Group>
      {magnetized && (
        <MagnetizedWargearScroller
          model={model}
          slotId={slotId}
          slotName={slot.name ?? "Slot"}
          options={resolvedOptions}
          disabled={isUpdatingThisSlot}
          onEquip={(key) => commitWargear(slotId, { equipKey: key })}
          onRemove={(key) => commitWargear(slotId, { removeKey: key })}
        />
      )}
      <Select
        size="xs"
        placeholder={magnetized ? "Add option" : "Unassigned"}
        clearable={!magnetized}
        searchable={magnetized}
        description={linkedPartnerTitle(slotId, attachmentSlots, model)}
        data={wargearPickerData(slotId, attachmentSlots, eligible, model)}
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
          commitWargear(slotId, { ...update, addBit: magnetized });
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
            setCustomLabelDraftsBySlot({
              ...customLabelDraftsBySlot,
              [slotId]: e.currentTarget.value,
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
}

function BadgeChip({ label, active, onClick }: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <Button
      variant={active ? "filled" : "light"}
      size="compact-xs"
      title={active ? label : `Field as ${label}`}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
