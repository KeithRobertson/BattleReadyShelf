import { Badge, Button, Group, Select, Stack, Text, Textarea, TextInput, Title } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  IconArrowLeft,
  IconCheck,
  IconExchange,
  IconMagnet,
  IconPencil,
  IconPhoto,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { InspectorImageLibrary } from "@/components/collection/aside/InspectorImageLibrary.tsx";
import ChangeModelDefinitionModal from "@/components/collection/group/model/ChangeModelDefinitionModal.tsx";
import { ModelCardWargear } from "@/components/collection/group/model/ModelCardWargear.tsx";
import PaintRecipeEditorModal from "@/components/collection/paint/PaintRecipeEditorModal.tsx";
import PaintRecipeSummary from "@/components/collection/paint/PaintRecipeSummary.tsx";
import { StatusHistory } from "@/components/collection/StatusHistory.tsx";
import { WargearLoadoutBadge } from "@/components/collection/WargearLoadoutBadge.tsx";
import ModelDefinitionOriginBadge from "@/components/modeldefinitions/ModelDefinitionOriginBadge.tsx";
import type { CollectionModel, CollectionModelStatus, Paint, PaintRecipe, SavePaintRecipeRequest } from "@/generated";
import type { ModelDefinitionSelectData } from "@/pages/CollectionPage.tsx";
import type { WargearSlotUpdate } from "@/utils/collection/applyWargearSelection.ts";
import effectivePaintRecipes from "@/utils/collection/effectivePaintRecipes.ts";
import loadoutDisplayItems from "@/utils/collection/loadoutDisplayItems.ts";
import { allWargearOptions } from "@/utils/collection/modelLoadout.ts";
import {
  COLLECTION_MODEL_STATUS_COLORS,
  COLLECTION_MODEL_STATUS_LABELS,
  COLLECTION_MODEL_STATUS_OPTIONS,
} from "@/utils/collectionModelStatus.ts";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic";

export type ModelInspectorEditing = Readonly<{
  modelDefinitionSelectData: ModelDefinitionSelectData;
  isUploading: boolean;
  deletingImageId: string | null;
  isDeleting: boolean;
  recipe: PaintRecipe | null;
  paints: Paint[];
  savingPaints: boolean;
  armyCollectionId: string | undefined;
  onRename: (newName: string) => void;
  onDeleteModel: () => void;
  onUpdateDescription: (description: string) => void;
  onUpdateWargearSelection: (slotId: string, update: WargearSlotUpdate) => void;
  onUpdateAlternateIdentities: (ids: string[]) => void;
  onUpdateStatus: (status: CollectionModelStatus) => void;
  onRecordStatusChange: (status: CollectionModelStatus, changedOn: string) => void;
  recordingStatusChange: boolean;
  onChangeModelDefinition: (modelDefinitionId: string) => void;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  onSavePaintRecipe: (request: SavePaintRecipeRequest) => Promise<unknown>;
}>;

export type CollectionModelInspectorProps = Readonly<{
  model: CollectionModel;
  recipes: PaintRecipe[];
  onBack: () => void;
  /** Present when the viewer owns the miniature. Edit in the aside does not change the list. */
  editing?: ModelInspectorEditing;
}>;

function ModelIdentity({ model }: Readonly<{ model: CollectionModel }>) {
  return (
    <Group gap="xs" wrap="wrap" mb={4}>
      <Badge variant="light">{model.modelDefinition?.name ?? "Unknown type"}</Badge>
      {(model.alternateModelDefinitions ?? []).map((definition) => (
        <Badge key={definition.id} variant="outline" leftSection={<IconMagnet size={12} />}>
          or {definition.name ?? "another type"}
        </Badge>
      ))}
      {model.modelDefinition && <ModelDefinitionOriginBadge definition={model.modelDefinition} />}
    </Group>
  );
}

function ReadOnlyDetails({ model, recipes }: Readonly<{ model: CollectionModel; recipes: PaintRecipe[] }>) {
  const displayName = model.name?.trim() || "Unnamed";
  const description = model.description?.trim();
  const images = model.images ?? [];
  const attachmentSlots = model.modelDefinition?.attachmentSlots ?? [];
  const wargearOptions = allWargearOptions(model);
  const paintRecipes = effectivePaintRecipes(model, recipes);

  return (
    <>
      {model.status && (
        <Badge color={COLLECTION_MODEL_STATUS_COLORS[model.status]} variant="light">
          {COLLECTION_MODEL_STATUS_LABELS[model.status]}
        </Badge>
      )}

      {images.length > 0 ? (
        <InspectorImageLibrary key={model.id} images={images} alt={displayName} />
      ) : (
        <Group
          justify="center"
          align="center"
          h={120}
          style={{
            border: "1px dashed var(--mantine-color-gray-4)",
            borderRadius: "var(--mantine-radius-sm)",
          }}
        >
          <IconPhoto size={24} color="var(--mantine-color-gray-5)" />
        </Group>
      )}

      {description && (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {description}
        </Text>
      )}

      <Stack gap={4}>
        <Text size="sm" fw={600}>
          Status changes
        </Text>
        <StatusHistory model={model} />
      </Stack>

      {attachmentSlots.length > 0 && (
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Loadout
          </Text>
          <Group gap={4} wrap="wrap">
            {loadoutDisplayItems(attachmentSlots, model, wargearOptions).map((item) => (
              <WargearLoadoutBadge key={item.key} item={item} />
            ))}
          </Group>
        </Stack>
      )}

      <Stack gap={4}>
        <Text size="sm" fw={600}>
          Paints
        </Text>
        {paintRecipes.length > 0 ? (
          <PaintRecipeSummary recipes={paintRecipes} showScope />
        ) : (
          <Text size="xs" c="dimmed">
            No paints recorded
          </Text>
        )}
      </Stack>
    </>
  );
}

function ModelInspectorEditor({
  model,
  recipes,
  editing,
}: Readonly<{ model: CollectionModel; recipes: PaintRecipe[]; editing: ModelInspectorEditing }>) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const displayName = model.name?.trim() ?? "";
  const description = model.description?.trim() ?? "";
  const [nameDraft, setNameDraft] = useState(displayName);
  const [descriptionDraft, setDescriptionDraft] = useState(description);
  const [changingType, setChangingType] = useState(false);
  const [pastStatus, setPastStatus] = useState<CollectionModelStatus | null>(null);
  const [changedOn, setChangedOn] = useState<string | null>(null);
  const [editingPaints, setEditingPaints] = useState(false);
  const [isEditingWargear, setIsEditingWargear] = useState(true);
  const [customWargearModeBySlot, setCustomWargearModeBySlot] = useState<Record<string, boolean>>({});
  const [customLabelDraftsBySlot, setCustomLabelDraftsBySlot] = useState<Record<string, string>>({});
  const [updatingWargearSlotId, setUpdatingWargearSlotId] = useState<string | null>(null);

  const images = model.images ?? [];
  const attachmentSlots = model.modelDefinition?.attachmentSlots ?? [];
  const wargearOptions = model.modelDefinition?.wargearOptions ?? [];
  const paintRecipes = effectivePaintRecipes(model, recipes);

  function commitName() {
    const next = nameDraft.trim();
    if (next !== displayName) editing.onRename(next);
  }

  function commitDescription() {
    const next = descriptionDraft.trim();
    if (next !== description) editing.onUpdateDescription(next);
  }

  function commitWargear(slotId: string, update: WargearSlotUpdate) {
    setUpdatingWargearSlotId(slotId);
    editing.onUpdateWargearSelection(slotId, update);
    setUpdatingWargearSlotId(null);
  }

  function openFilePicker() {
    if (!editing.isUploading) fileInputRef.current?.click();
  }

  return (
    <Stack gap="sm">
      <TextInput
        label="Name"
        value={nameDraft}
        onChange={(event) => setNameDraft(event.currentTarget.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />

      <Select
        label="Status"
        data={COLLECTION_MODEL_STATUS_OPTIONS}
        value={model.status ?? null}
        onChange={(value) => value && editing.onUpdateStatus(value)}
        allowDeselect={false}
      />

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept={IMAGE_ACCEPT}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) editing.onUploadImage(file);
          event.target.value = "";
        }}
      />

      {images.length > 0 ? (
        <InspectorImageLibrary
          key={model.id}
          images={images}
          alt={displayName || "Model"}
          onDeleteImage={editing.onDeleteImage}
          deletingImageId={editing.deletingImageId}
        />
      ) : (
        <Group
          justify="center"
          align="center"
          h={120}
          onClick={openFilePicker}
          style={{
            border: "1px dashed var(--mantine-color-gray-4)",
            borderRadius: "var(--mantine-radius-sm)",
            cursor: editing.isUploading ? "default" : "pointer",
          }}
        >
          <IconPhoto size={24} color="var(--mantine-color-gray-5)" />
        </Group>
      )}

      <Button
        variant="light"
        size="xs"
        leftSection={<IconUpload size={14} />}
        onClick={openFilePicker}
        loading={editing.isUploading}
      >
        Add photo
      </Button>

      <Textarea
        label="Description"
        minRows={2}
        maxRows={6}
        value={descriptionDraft}
        onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
        onBlur={commitDescription}
        placeholder="Notes about this miniature"
      />

      <Stack gap={4}>
        <Text size="sm" fw={600}>
          Status changes
        </Text>
        <StatusHistory model={model} />
        <Select
          label="Changed to"
          placeholder="Status"
          data={COLLECTION_MODEL_STATUS_OPTIONS}
          value={pastStatus}
          onChange={(value) => setPastStatus(value as CollectionModelStatus | null)}
          clearable
        />
        <DateInput
          label="On"
          value={changedOn}
          onChange={setChangedOn}
          valueFormat="DD MMM YYYY"
          placeholder="Date"
          maxDate={new Date()}
          clearable
        />
        <Button
          size="xs"
          variant="light"
          disabled={!pastStatus || !changedOn}
          loading={editing.recordingStatusChange}
          onClick={() => {
            if (!pastStatus || !changedOn) return;
            editing.onRecordStatusChange(pastStatus, changedOn);
            setChangedOn(null);
          }}
        >
          Add to history
        </Button>
      </Stack>

      <ModelCardWargear
        model={model}
        editMode
        wargearOptions={wargearOptions}
        attachmentSlots={attachmentSlots}
        customWargearModeBySlot={customWargearModeBySlot}
        customLabelDraftsBySlot={customLabelDraftsBySlot}
        isEditingWargear={isEditingWargear}
        updatingWargearSlotId={updatingWargearSlotId}
        commitWargear={commitWargear}
        onUpdateAlternateIdentities={editing.onUpdateAlternateIdentities}
        onSwitchIdentity={editing.onChangeModelDefinition}
        modelDefinitionSelectData={editing.modelDefinitionSelectData}
        setCustomWargearModeBySlot={setCustomWargearModeBySlot}
        setCustomLabelDraftsBySlot={setCustomLabelDraftsBySlot}
        setIsEditingWargear={setIsEditingWargear}
      />

      <Stack gap={4}>
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            Paints
          </Text>
          {editing.armyCollectionId && (
            <Button size="xs" variant="subtle" onClick={() => setEditingPaints(true)}>
              Edit paints
            </Button>
          )}
        </Group>
        {paintRecipes.length > 0 ? (
          <PaintRecipeSummary recipes={paintRecipes} showScope />
        ) : (
          <Text size="xs" c="dimmed">
            No paints recorded
          </Text>
        )}
      </Stack>

      {editing.armyCollectionId && (
        <PaintRecipeEditorModal
          opened={editingPaints}
          onClose={() => setEditingPaints(false)}
          target={{ scope: "MODEL", collectionModelId: model.id }}
          armyCollectionId={editing.armyCollectionId}
          targetName={displayName || "This model"}
          recipe={editing.recipe}
          paints={editing.paints}
          saving={editing.savingPaints}
          onSave={editing.onSavePaintRecipe}
        />
      )}

      <Group justify="space-between" mt="xs">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconExchange size={14} />}
          onClick={() => setChangingType(true)}
        >
          Change type
        </Button>
        <Button
          color="red"
          variant="subtle"
          size="xs"
          leftSection={<IconTrash size={14} />}
          onClick={editing.onDeleteModel}
          loading={editing.isDeleting}
        >
          Delete model
        </Button>
      </Group>

      <ChangeModelDefinitionModal
        opened={changingType}
        onClose={() => setChangingType(false)}
        model={model}
        modelDefinitionSelectData={editing.modelDefinitionSelectData}
        onConfirm={editing.onChangeModelDefinition}
      />
    </Stack>
  );
}

export function CollectionModelInspector({ model, recipes, onBack, editing }: CollectionModelInspectorProps) {
  const displayName = model.name?.trim() || "Unnamed";
  const [seenModelId, setSeenModelId] = useState(model.id);
  const [isEditing, setIsEditing] = useState(false);
  if (model.id !== seenModelId) {
    setSeenModelId(model.id);
    setIsEditing(false);
  }
  const showEditor = Boolean(editing) && isEditing;

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          onClick={onBack}
          justify="flex-start"
        >
          Back to summary
        </Button>
        {editing &&
          (showEditor ? (
            <Button
              variant="default"
              size="xs"
              leftSection={<IconCheck size={14} />}
              onClick={() => setIsEditing(false)}
              aria-label="Done editing model"
            >
              Done
            </Button>
          ) : (
            <Button
              variant="light"
              size="xs"
              leftSection={<IconPencil size={14} />}
              onClick={() => setIsEditing(true)}
              aria-label="Edit model"
            >
              Edit
            </Button>
          ))}
      </Group>

      <div>
        <ModelIdentity model={model} />
        {!showEditor && <Title order={4}>{displayName}</Title>}
      </div>

      {showEditor && editing ? (
        <ModelInspectorEditor key={model.id} model={model} recipes={recipes} editing={editing} />
      ) : (
        <ReadOnlyDetails model={model} recipes={recipes} />
      )}
    </Stack>
  );
}
