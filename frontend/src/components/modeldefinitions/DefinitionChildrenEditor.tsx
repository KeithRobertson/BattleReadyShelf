import { ActionIcon, Box, Button, Checkbox, Group, MultiSelect, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import type { EditableOption, EditableSlot } from "@/components/modeldefinitions/definitionChildren.ts";
import { DEFAULT_SLOT_TYPE, newId } from "@/components/modeldefinitions/definitionChildren.ts";
import WargearOptionPicker from "@/components/modeldefinitions/WargearOptionPicker.tsx";
import type { WargearDefinition } from "@/generated";

type AttachmentSlotsEditorProps = Readonly<{
  slots: EditableSlot[];
  setSlots: Dispatch<SetStateAction<EditableSlot[]>>;
  onSlotRemoved: (slotId: string) => void;
}>;

function AttachmentSlotsEditor({ slots, setSlots, onSlotRemoved }: AttachmentSlotsEditorProps) {
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
            // Two inputs plus a delete button will not fit across a phone, so the pair wraps onto
            // separate lines while the delete button stays tied to the input it removes.
            <Group key={slot.id} align="flex-end" wrap="wrap" gap="xs">
              <TextInput
                flex="1 1 140px"
                miw={140}
                value={slot.name}
                placeholder="Slot name"
                onChange={(e) => updateSlot(slot.id, { name: e.currentTarget.value })}
              />
              <Group gap="xs" wrap="nowrap" flex="1 1 140px" miw={140}>
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

type WargearOptionsEditorProps = Readonly<{
  options: EditableOption[];
  setOptions: Dispatch<SetStateAction<EditableOption[]>>;
  slots: EditableSlot[];
  wargearDefinitions: WargearDefinition[];
}>;

function WargearOptionsEditor({ options, setOptions, slots, wargearDefinitions }: WargearOptionsEditorProps) {
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
            setOptions((current) => [...current, { id: newId(), name: "", isDefault: false, attachmentSlotIds: [] }])
          }
        >
          Add option
        </Button>
      </Group>
      {options.length === 0 ? (
        <Text c="dimmed" size="sm">
          No wargear options.
        </Text>
      ) : (
        <Stack gap="xs">
          {options.map((option) => (
            // Wraps rather than forcing one row: on a phone the picker and slot select each take a
            // full line, with the default/delete controls staying together beneath them. Without
            // this the four controls are squeezed onto one row and the last two end up off-screen.
            <Group key={option.id} align="flex-end" wrap="wrap" gap="xs">
              <Box flex="1 1 180px" miw={180}>
                <WargearOptionPicker
                  definitions={wargearDefinitions}
                  value={{ wargearDefinitionId: option.wargearDefinitionId, name: option.name }}
                  onChange={(selection) =>
                    updateOption(option.id, {
                      wargearDefinitionId: selection.wargearDefinitionId,
                      name: selection.name,
                    })
                  }
                />
              </Box>
              <MultiSelect
                flex="1 1 180px"
                miw={180}
                placeholder="Fills slot(s)"
                data={slotChoices}
                value={option.attachmentSlotIds}
                onChange={(value) => updateOption(option.id, { attachmentSlotIds: value })}
              />
              <Group gap="xs" wrap="nowrap">
                <Checkbox
                  label="Default"
                  checked={option.isDefault}
                  onChange={(e) => updateOption(option.id, { isDefault: e.currentTarget.checked })}
                />
                <ActionIcon
                  color="red"
                  variant="subtle"
                  aria-label={`Remove option ${option.name || "(unnamed)"}`}
                  onClick={() => setOptions((current) => current.filter((o) => o.id !== option.id))}
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
      current.map((option) => ({
        ...option,
        attachmentSlotIds: option.attachmentSlotIds.filter((id) => id !== slotId),
      })),
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
