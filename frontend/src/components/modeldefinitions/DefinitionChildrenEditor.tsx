import { ActionIcon, Box, Button, Checkbox, Group, MultiSelect, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import type { EditableOption, EditableSlot } from "@/components/modeldefinitions/definitionChildren.ts";
import { DEFAULT_SLOT_TYPE, newId } from "@/components/modeldefinitions/definitionChildren.ts";
import DefaultLoadoutWarning from "@/components/modeldefinitions/DefaultLoadoutWarning.tsx";
import WargearOptionPicker from "@/components/modeldefinitions/WargearOptionPicker.tsx";
import type { WargearDefinition } from "@/generated";
import useIsMobile from "@/hooks/useIsMobile.ts";

type AttachmentSlotsEditorProps = Readonly<{
  slots: EditableSlot[];
  setSlots: Dispatch<SetStateAction<EditableSlot[]>>;
  onSlotRemoved: (slotId: string) => void;
}>;

function AttachmentSlotsEditor({ slots, setSlots, onSlotRemoved }: AttachmentSlotsEditorProps) {
  const isMobile = useIsMobile();

  function updateSlot(slotId: string, changes: Partial<EditableSlot>) {
    setSlots((current) => current.map((slot) => (slot.id === slotId ? { ...slot, ...changes } : slot)));
  }

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Title order={5}>Attachment slots</Title>
        <Button
          size="xs"
          variant="light"
          onClick={() => setSlots((current) => [...current, { id: newId(), name: "", type: DEFAULT_SLOT_TYPE }])}
        >
          Add slot
        </Button>
      </Group>
      {slots.length === 0 ? (
        <Text c="dimmed" size="sm">
          No attachment slots.
        </Text>
      ) : (
        <Stack gap="xs">
          {slots.map((slot) => (
            // Two inputs plus a delete button will not fit across a phone, so below `sm` each input
            // takes a full line. Relying on flex wrapping alone is not enough: a phone viewport is
            // wide enough for both bases to fit, so the row would never actually wrap.
            <Group key={slot.id} align="flex-end" wrap="wrap" gap="xs">
              <TextInput
                flex={isMobile ? "1 1 100%" : "1 1 140px"}
                miw={isMobile ? 0 : 140}
                value={slot.name}
                placeholder="Slot name"
                onChange={(e) => updateSlot(slot.id, { name: e.currentTarget.value })}
              />
              <Group gap="xs" wrap="nowrap" flex={isMobile ? "1 1 100%" : "1 1 140px"} miw={isMobile ? 0 : 140}>
                <TextInput
                  flex={1}
                  value={slot.type}
                  placeholder="Slot type"
                  onChange={(e) => updateSlot(slot.id, { type: e.currentTarget.value })}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  aria-label={`Remove slot ${slot.name || "(unnamed)"}`}
                  onClick={() => onSlotRemoved(slot.id)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      )}
    </div>
  );
}

type SlotChoice = Readonly<{ value: string; label: string }>;

type WargearOptionRowProps = Readonly<{
  option: EditableOption;
  isMobile: boolean;
  slotChoices: SlotChoice[];
  wargearDefinitions: WargearDefinition[];
  onUpdate: (changes: Partial<EditableOption>) => void;
  onRemove: () => void;
}>;

function WargearOptionRow({
  option,
  isMobile,
  slotChoices,
  wargearDefinitions,
  onUpdate,
  onRemove,
}: WargearOptionRowProps) {
  const flex = isMobile ? "1 1 100%" : "1 1 180px";
  return (
    // Below `sm` the picker and slot select each take a full line, with the default/delete
    // controls beneath them. Flex wrapping alone does not achieve this: a phone viewport is
    // ~400-500px CSS pixels, so both ~180px bases fit on one row and the row never wraps,
    // leaving the four controls squeezed together as they are on desktop.
    <Group align="flex-end" wrap="wrap" gap="xs">
      <Box flex={flex} miw={isMobile ? 0 : 180}>
        <WargearOptionPicker
          definitions={wargearDefinitions}
          value={{ wargearDefinitionId: option.wargearDefinitionId, name: option.name }}
          onChange={(selection) =>
            onUpdate({
              wargearDefinitionId: selection.wargearDefinitionId,
              name: selection.name,
            })
          }
        />
      </Box>
      <MultiSelect
        flex={flex}
        miw={isMobile ? 0 : 180}
        placeholder="Can attach to"
        data={slotChoices}
        value={option.attachmentSlotIds}
        onChange={(value) =>
          onUpdate({ attachmentSlotIds: value, isDefaultLinked: value.length >= 2 ? option.isDefaultLinked : false })
        }
      />
      <Group gap="xs" wrap="nowrap">
        <Checkbox
          label="Default"
          checked={option.isDefault}
          onChange={(e) => {
            const isDefault = e.currentTarget.checked;
            onUpdate({ isDefault, isDefaultLinked: isDefault ? option.isDefaultLinked : false });
          }}
        />
        {option.isDefault && option.attachmentSlotIds.length >= 2 && (
          <Checkbox
            label="One item in these slots"
            checked={option.isDefaultLinked}
            onChange={(e) => onUpdate({ isDefaultLinked: e.currentTarget.checked })}
          />
        )}
        <ActionIcon
          color="red"
          variant="subtle"
          aria-label={`Remove option ${option.name || "(unnamed)"}`}
          onClick={onRemove}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

type WargearOptionsEditorProps = Readonly<{
  options: EditableOption[];
  setOptions: Dispatch<SetStateAction<EditableOption[]>>;
  slots: EditableSlot[];
  wargearDefinitions: WargearDefinition[];
}>;

function WargearOptionsEditor({ options, setOptions, slots, wargearDefinitions }: WargearOptionsEditorProps) {
  const isMobile = useIsMobile();
  const slotChoices = slots.map((slot) => ({ value: slot.id, label: slot.name || "(unnamed slot)" }));

  function updateOption(optionId: string, changes: Partial<EditableOption>) {
    setOptions((current) => current.map((option) => (option.id === optionId ? { ...option, ...changes } : option)));
  }

  return (
    <div>
      <Group justify="space-between" mb="xs">
        <Title order={5}>Wargear options</Title>
        <Button
          size="xs"
          variant="light"
          onClick={() =>
            setOptions((current) => [
              ...current,
              { id: newId(), name: "", isDefault: false, isDefaultLinked: false, attachmentSlotIds: [] },
            ])
          }
        >
          Add option
        </Button>
      </Group>
      <Text size="xs" c="dimmed" mb="xs">
        Can attach to is eligibility: listing both arms means the item may go in either, not that one copy occupies
        both. Tick Default to fill those slots on a new miniature. Tick One item in these slots for a two-handed
        default. Two-handed occupancy on a specific miniature is still chosen when filling a slot.
      </Text>
      <DefaultLoadoutWarning slots={slots} options={options} />
      {options.length === 0 ? (
        <Text c="dimmed" size="sm">
          No wargear options.
        </Text>
      ) : (
        <Stack gap="xs">
          {options.map((option) => (
            <WargearOptionRow
              key={option.id}
              option={option}
              isMobile={isMobile}
              slotChoices={slotChoices}
              wargearDefinitions={wargearDefinitions}
              onUpdate={(changes) => updateOption(option.id, changes)}
              onRemove={() => setOptions((current) => current.filter((row) => row.id !== option.id))}
            />
          ))}
        </Stack>
      )}
    </div>
  );
}

export type DefinitionChildrenEditorProps = Readonly<{
  slots: EditableSlot[];
  setSlots: Dispatch<SetStateAction<EditableSlot[]>>;
  options: EditableOption[];
  setOptions: Dispatch<SetStateAction<EditableOption[]>>;
  wargearDefinitions: WargearDefinition[];
}>;

/**
 * The slots-and-options half of a model definition editor, shared by the admin draft editor and a
 * user's own definitions so the two cannot drift apart.
 *
 * Removing a slot also drops it from every option that filled it, because an option referencing a
 * slot that no longer exists would be rejected on save.
 */
export default function DefinitionChildrenEditor({
  slots,
  setSlots,
  options,
  setOptions,
  wargearDefinitions,
}: DefinitionChildrenEditorProps) {
  function removeSlot(slotId: string) {
    setSlots((current) => current.filter((slot) => slot.id !== slotId));
    setOptions((current) =>
      current.map((option) => {
        const attachmentSlotIds = option.attachmentSlotIds.filter((id) => id !== slotId);
        return {
          ...option,
          attachmentSlotIds,
          isDefaultLinked: attachmentSlotIds.length >= 2 ? option.isDefaultLinked : false,
        };
      }),
    );
  }

  return (
    <>
      <AttachmentSlotsEditor slots={slots} setSlots={setSlots} onSlotRemoved={removeSlot} />
      <WargearOptionsEditor
        options={options}
        setOptions={setOptions}
        slots={slots}
        wargearDefinitions={wargearDefinitions}
      />
    </>
  );
}
