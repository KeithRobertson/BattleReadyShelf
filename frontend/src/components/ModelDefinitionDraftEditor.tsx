import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { Faction, ModelDefinition, ModelDefinitionDraft, UpsertModelDefinitionDraftRequest } from "@/generated";
import { discardModelDefinitionDraft, publishModelDefinitionDraft, updateModelDefinitionDraft } from "@/generated";

interface EditableSlot {
  id: string;
  name: string;
}

interface EditableOption {
  id: string;
  name: string;
  isDefault: boolean;
  attachmentSlotIds: string[];
}

function newId(): string {
  return crypto.randomUUID();
}

function toRequest(
  name: string,
  faction: string | undefined,
  description: string,
  slots: EditableSlot[],
  options: EditableOption[],
): UpsertModelDefinitionDraftRequest {
  return {
    name,
    faction_id: faction,
    description: description || undefined,
    attachmentSlots: slots.map((s) => ({ id: s.id, name: s.name })),
    wargearOptions: options.map((o) => ({
      id: o.id,
      name: o.name,
      isDefault: o.isDefault,
      attachmentSlotIds: o.attachmentSlotIds,
    })),
  };
}

export type ModelDefinitionDraftEditorProps = Readonly<{
  draft: ModelDefinitionDraft;
  factions: Faction[];
  onClose: () => void;
  onSaved: (draft: ModelDefinitionDraft) => void;
  onPublished: (modelDefinition: ModelDefinition) => void;
  onDiscarded: (draftId: string) => void;
}>;

export default function ModelDefinitionDraftEditor({
  draft,
  factions,
  onClose,
  onSaved,
  onPublished,
  onDiscarded,
}: ModelDefinitionDraftEditorProps) {
  const [name, setName] = useState(draft.name);
  const [faction, setFaction] = useState(draft.factionId);
  const [description, setDescription] = useState(draft.description ?? "");
  const [slots, setSlots] = useState<EditableSlot[]>(
    draft.attachmentSlots.map((s) => ({ id: s.id ?? newId(), name: s.name })),
  );
  const [options, setOptions] = useState<EditableOption[]>(
    draft.wargearOptions.map((o) => ({
      id: o.id ?? newId(),
      name: o.name,
      isDefault: o.isDefault,
      attachmentSlotIds: o.attachmentSlotIds,
    })),
  );
  const [changeSummary, setChangeSummary] = useState("");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotOptions = slots.map((s) => ({ value: s.id, label: s.name || "(unnamed slot)" }));

  // Replaces local editor state with the server's view of the draft. Needed after
  // save/publish because the backend assigns real ids to newly-added slots/options
  // (replacing the client-generated placeholder ids) - without this, a second save
  // would treat those rows as new again instead of updating them in place.
  function applyServerDraft(serverDraft: ModelDefinitionDraft) {
    setName(serverDraft.name);
    setDescription(serverDraft.description ?? "");
    setSlots(serverDraft.attachmentSlots.map((s) => ({ id: s.id ?? newId(), name: s.name })));
    setOptions(
      serverDraft.wargearOptions.map((o) => ({
        id: o.id ?? newId(),
        name: o.name,
        isDefault: o.isDefault,
        attachmentSlotIds: o.attachmentSlotIds,
      })),
    );
  }

  function addSlot() {
    setSlots((s) => [...s, { id: newId(), name: "" }]);
  }

  function removeSlot(id: string) {
    setSlots((s) => s.filter((slot) => slot.id !== id));
    setOptions((opts) =>
      opts.map((o) => ({ ...o, attachmentSlotIds: o.attachmentSlotIds.filter((sid) => sid !== id) })),
    );
  }

  function addOption() {
    setOptions((o) => [...o, { id: newId(), name: "", isDefault: false, attachmentSlotIds: [] }]);
  }

  function removeOption(id: string) {
    setOptions((o) => o.filter((option) => option.id !== id));
  }

  // `closeOnSuccess` is true for the explicit "Save draft" button, but false when this
  // is called internally by handlePublish (which needs the draft persisted first without
  // closing the modal out from under the publish confirmation step).
  async function handleSave(closeOnSuccess = false): Promise<ModelDefinitionDraft | null> {
    setError(null);
    setSaving(true);
    try {
      const updated = (
        await updateModelDefinitionDraft({
          path: { draftId: draft.id ?? "" },
          body: toRequest(name, faction, description, slots, options),
        })
      ).data;
      if (!updated) throw new Error("Failed to save draft");
      applyServerDraft(updated);
      onSaved(updated);
      if (closeOnSuccess) onClose();
      return updated;
    } catch (e) {
      setError(String(e));
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setError(null);
    setPublishing(true);
    try {
      const saved = await handleSave();
      if (!saved) return;
      const published = (
        await publishModelDefinitionDraft({
          path: { draftId: draft.id ?? "" },
          body: { changeSummary: changeSummary || undefined },
        })
      ).data;
      if (!published) throw new Error("Failed to publish draft");
      onPublished(published);
    } catch (e) {
      setError(String(e));
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (!draft.id) return;
    setError(null);
    setDiscarding(true);
    try {
      await discardModelDefinitionDraft({ path: { draftId: draft.id } });
      onDiscarded(draft.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setDiscarding(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title="Edit model definition draft" size="lg">
      <Stack gap="md">
        {draft.publishedModelDefinitionId ? (
          <Badge variant="light" w="fit-content">
            Editing published model
          </Badge>
        ) : (
          <Badge variant="light" color="grape" w="fit-content">
            New, unpublished model
          </Badge>
        )}

        {error && (
          <Text c="red" size="sm">
            {error}
          </Text>
        )}

        <TextInput
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
          }}
          required
        />
        <Select
          label="Faction"
          data={factions.map((f) => ({ value: f.id, label: f.name }))}
          value={faction}
          onChange={(faction) => {
            if (faction) {
              setFaction(faction);
            }
          }}
          required
        />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => {
            setDescription(e.currentTarget.value);
          }}
          autosize
          minRows={2}
        />

        <div>
          <Group justify="space-between" mb="xs">
            <Title order={5}>Attachment slots</Title>
            <Button size="xs" variant="light" onClick={addSlot}>
              Add slot
            </Button>
          </Group>
          {slots.length === 0 ? (
            <Text c="dimmed" size="sm">
              No attachment slots.
            </Text>
          ) : (
            <Table verticalSpacing="xs">
              <Table.Tbody>
                {slots.map((slot) => (
                  <Table.Tr key={slot.id}>
                    <Table.Td>
                      <TextInput
                        value={slot.name}
                        placeholder="Slot name"
                        onChange={(e) => {
                          const value = e.currentTarget.value;
                          setSlots((s) => s.map((sl) => (sl.id === slot.id ? { ...sl, name: value } : sl)));
                        }}
                      />
                    </Table.Td>
                    <Table.Td w={40}>
                      <ActionIcon color="red" variant="subtle" onClick={() => removeSlot(slot.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </div>

        <div>
          <Group justify="space-between" mb="xs">
            <Title order={5}>Wargear options</Title>
            <Button size="xs" variant="light" onClick={addOption}>
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
                <Group key={option.id} align="flex-start" wrap="nowrap">
                  <TextInput
                    flex={1}
                    value={option.name}
                    placeholder="Option name"
                    onChange={(e) => {
                      const value = e.currentTarget.value;
                      setOptions((o) => o.map((opt) => (opt.id === option.id ? { ...opt, name: value } : opt)));
                    }}
                  />
                  <MultiSelect
                    flex={1}
                    placeholder="Fills slot(s)"
                    data={slotOptions}
                    value={option.attachmentSlotIds}
                    onChange={(value) => {
                      setOptions((o) =>
                        o.map((opt) => (opt.id === option.id ? { ...opt, attachmentSlotIds: value } : opt)),
                      );
                    }}
                  />
                  <Checkbox
                    label="Default"
                    checked={option.isDefault}
                    onChange={(e) => {
                      const checked = e.currentTarget.checked;
                      setOptions((o) => o.map((opt) => (opt.id === option.id ? { ...opt, isDefault: checked } : opt)));
                    }}
                  />
                  <ActionIcon color="red" variant="subtle" onClick={() => removeOption(option.id)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          )}
        </div>

        {showPublishConfirm ? (
          <Stack gap="xs" p="sm" style={{ border: "1px solid var(--mantine-color-gray-3)", borderRadius: 4 }}>
            <Textarea
              label="Change summary (optional, recorded in the audit trail)"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setShowPublishConfirm(false)}>
                Cancel
              </Button>
              <Button color="green" loading={publishing} onClick={handlePublish}>
                Confirm publish
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group justify="space-between">
            <Button color="red" variant="subtle" loading={discarding} onClick={handleDiscard}>
              Discard draft
            </Button>
            <Group>
              <Button variant="default" loading={saving} onClick={() => handleSave(true)}>
                Save draft
              </Button>
              <Button color="green" onClick={() => setShowPublishConfirm(true)}>
                Publish...
              </Button>
            </Group>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
