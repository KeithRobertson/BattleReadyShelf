import { Badge, Button, Group, Select, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useState } from "react";
import DefinitionChildrenEditor from "@/components/modeldefinitions/DefinitionChildrenEditor.tsx";
import type { EditableOption, EditableSlot } from "@/components/modeldefinitions/definitionChildren.ts";
import {
  toEditableOptions,
  toEditableSlots,
  toUpsertRequest,
} from "@/components/modeldefinitions/definitionChildren.ts";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { Faction, ModelDefinition, ModelDefinitionDraft, WargearDefinition } from "@/generated";
import { discardModelDefinitionDraft, publishModelDefinitionDraft, updateModelDefinitionDraft } from "@/generated";

export type ModelDefinitionDraftEditorProps = Readonly<{
  draft: ModelDefinitionDraft;
  factions: Faction[];
  wargearDefinitions: WargearDefinition[];
  onClose: () => void;
  onSaved: (draft: ModelDefinitionDraft) => void;
  onPublished: (modelDefinition: ModelDefinition) => void;
  onDiscarded: (draftId: string) => void;
}>;

export default function ModelDefinitionDraftEditor({
  draft,
  factions,
  wargearDefinitions,
  onClose,
  onSaved,
  onPublished,
  onDiscarded,
}: ModelDefinitionDraftEditorProps) {
  const [name, setName] = useState(draft.name);
  const [faction, setFaction] = useState(draft.factionId);
  const [description, setDescription] = useState(draft.description ?? "");
  const [slots, setSlots] = useState<EditableSlot[]>(toEditableSlots(draft.attachmentSlots));
  const [options, setOptions] = useState<EditableOption[]>(toEditableOptions(draft.wargearOptions));
  const [changeSummary, setChangeSummary] = useState("");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replaces local editor state with the server's view of the draft. Needed after
  // save/publish because the backend assigns real ids to newly-added slots/options
  // (replacing the client-generated placeholder ids) - without this, a second save
  // would treat those rows as new again instead of updating them in place.
  function applyServerDraft(serverDraft: ModelDefinitionDraft) {
    setName(serverDraft.name);
    setDescription(serverDraft.description ?? "");
    setSlots(toEditableSlots(serverDraft.attachmentSlots));
    setOptions(toEditableOptions(serverDraft.wargearOptions));
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
          body: toUpsertRequest(name, faction, description, slots, options),
        })
      ).data;
      if (!updated) {
        setError("Failed to save draft");
        return null;
      }
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
      if (!published) {
        setError("Failed to publish draft");
        return;
      }
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
    <ResponsiveModal
      opened
      onClose={onClose}
      title="Edit model definition draft"
      size="lg"
      footer={
        showPublishConfirm ? (
          <Stack gap="xs">
            <Textarea
              label="Change summary (optional, recorded in the audit trail)"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.currentTarget.value)}
              autosize
              minRows={1}
              maxRows={3}
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
            <Group gap="xs">
              <Button variant="default" loading={saving} onClick={() => handleSave(true)}>
                Save draft
              </Button>
              <Button color="green" onClick={() => setShowPublishConfirm(true)}>
                Publish...
              </Button>
            </Group>
          </Group>
        )
      }
    >
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
