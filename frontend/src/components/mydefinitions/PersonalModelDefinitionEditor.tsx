import { Alert, Badge, Button, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useState } from "react";
import DefinitionChildrenEditor from "@/components/modeldefinitions/DefinitionChildrenEditor.tsx";
import type { EditableOption, EditableSlot } from "@/components/modeldefinitions/definitionChildren.ts";
import {
  toEditableOptions,
  toEditableSlots,
  toUpsertRequest,
} from "@/components/modeldefinitions/definitionChildren.ts";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { Faction, ModelDefinition, WargearDefinition } from "@/generated";
import { updateMyModelDefinition } from "@/generated";
import { factionOptionLabel } from "@/utils/definitionOrigin.ts";

export type PersonalModelDefinitionEditorProps = Readonly<{
  definition: ModelDefinition;
  factions: Faction[];
  wargearDefinitions: WargearDefinition[];
  onClose: () => void;
  onSaved: (definition: ModelDefinition) => void;
}>;

/**
 * Edits one of the user's own model definitions. Unlike the admin editor there is no draft to
 * publish: a save takes effect for this user immediately, and only for them.
 */
export default function PersonalModelDefinitionEditor({
  definition,
  factions,
  wargearDefinitions,
  onClose,
  onSaved,
}: PersonalModelDefinitionEditorProps) {
  const [name, setName] = useState(definition.name);
  const [faction, setFaction] = useState(definition.factionId);
  const [description, setDescription] = useState(definition.description ?? "");
  const [slots, setSlots] = useState<EditableSlot[]>(toEditableSlots(definition.attachmentSlots ?? []));
  const [options, setOptions] = useState<EditableOption[]>(toEditableOptions(definition.wargearOptions ?? []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCustomisation = definition.baseModelDefinitionId != null;

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = (
        await updateMyModelDefinition({
          path: { modelDefinitionId: definition.id ?? "" },
          body: toUpsertRequest(name, faction, description, slots, options),
        })
      ).data;
      if (!updated) {
        setError("Failed to save");
        return;
      }
      onSaved(updated);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ResponsiveModal
      opened
      onClose={onClose}
      title="Edit your model definition"
      size="lg"
      footer={
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={handleSave}>
            Save
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
        {isCustomisation ? (
          <Badge variant="light" w="fit-content">
            Your version of a shared model
          </Badge>
        ) : (
          <Badge variant="light" color="grape" w="fit-content">
            Your own model
          </Badge>
        )}

        <Alert color="blue" icon={<IconInfoCircle size={16} />}>
          Only you can see this definition. Saving applies straight away — there is nothing to publish.
        </Alert>

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
        <Select
          label="Faction"
          data={factions.map((f) => ({ value: f.id, label: factionOptionLabel(f) }))}
          value={faction}
          onChange={(value) => {
            if (value) setFaction(value);
          }}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          autosize
          minRows={2}
        />

        <DefinitionChildrenEditor
          slots={slots}
          setSlots={setSlots}
          options={options}
          setOptions={setOptions}
          wargearDefinitions={wargearDefinitions}
        />
      </Stack>
    </ResponsiveModal>
  );
}
