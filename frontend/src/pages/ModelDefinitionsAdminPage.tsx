import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertCircle, IconCircleCheck, IconGitCompare, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import ModelDefinitionDraftEditor from "@/components/admin/modeldefinitions/ModelDefinitionDraftEditor.tsx";
import ModelDefinitionSlotTable from "@/components/admin/modeldefinitions/ModelDefinitionSlotTable.tsx";
import DefinitionDiffModal, { DRAFT_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type {
  Faction,
  ModelDefinition,
  ModelDefinitionDraft,
  ModelDefinitionExport,
  WargearDefinition,
} from "@/generated";
import {
  createModelDefinitionDraft,
  deleteModelDefinition,
  discardModelDefinitionDraft,
  exportModelDefinitions,
  getAdminModelDefinitions,
  getFactions,
  getModelDefinitionDrafts,
  getWargearDefinitions,
  importModelDefinitions,
  publishModelDefinitionDraft,
  startModelDefinitionDraft,
} from "@/generated";
import { type DraftDiff, diffModelDefinitionDraft } from "@/utils/modelDefinitionDraftDiff";

interface FactionGroup<T> {
  /** Groups keyed by faction id, so unresolvable ids cannot collide under a shared label. */
  key: string;
  faction: Faction | null;
  items: T[];
}

const UNCATEGORISED_LABEL = "Uncategorised";

// Groups items by factionId, sorting faction groups by name (uncategorised items last).
function groupByFaction<T extends { factionId?: string }>(
  items: T[],
  factionsById: Map<string, Faction>,
): FactionGroup<T>[] {
  const grouped = new Map<string, T[]>();
  for (const item of items) {
    const key = item.factionId ?? "";
    const list = grouped.get(key);
    if (list) list.push(item);
    else grouped.set(key, [item]);
  }
  const groups: FactionGroup<T>[] = [...grouped.entries()].map(([factionId, groupItems]) => ({
    key: factionId,
    faction: factionId ? (factionsById.get(factionId) ?? null) : null,
    items: groupItems,
  }));
  groups.sort((a, b) => {
    if (!a.faction && !b.faction) return 0;
    if (!a.faction) return 1;
    if (!b.faction) return -1;
    return a.faction.name.localeCompare(b.faction.name);
  });
  return groups;
}

/** Summarises at a glance what publishing a draft would actually do. */
function DraftStatusBadge({ diff }: Readonly<{ diff: DraftDiff | undefined }>) {
  if (!diff) return null;

  if (diff.isNew) {
    return (
      <Badge variant="light" color="grape">
        New
      </Badge>
    );
  }

  if (diff.changeCount === 0) {
    return (
      <Badge variant="light" color="gray">
        No changes
      </Badge>
    );
  }

  return (
    <Badge variant="light" color="blue">
      {diff.changeCount === 1 ? "1 change" : `${diff.changeCount} changes`}
    </Badge>
  );
}

function SelectAllCheckbox({
  label,
  allIds,
  selectedIds,
  onToggle,
}: Readonly<{
  label: string;
  allIds: string[];
  selectedIds: Set<string>;
  onToggle: (ids: string[], checked: boolean) => void;
}>) {
  if (allIds.length === 0) return null;
  const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;
  return (
    <Checkbox
      aria-label={label}
      checked={selectedCount === allIds.length}
      indeterminate={selectedCount > 0 && selectedCount < allIds.length}
      onChange={(e) => onToggle(allIds, e.currentTarget.checked)}
    />
  );
}

function FactionGroupSection({
  groupKey,
  label,
  itemCount,
  selectLabel,
  allIds,
  selectedIds,
  onToggleSelect,
  children,
}: Readonly<{
  groupKey: string;
  label: string;
  itemCount: number;
  selectLabel: string;
  allIds: string[];
  selectedIds: Set<string>;
  onToggleSelect: (ids: string[], checked: boolean) => void;
  children: React.ReactNode;
}>) {
  return (
    <Accordion.Item value={groupKey}>
      <Group gap="xs" wrap="nowrap" pr="xs">
        <Box onClick={(event) => event.stopPropagation()}>
          <SelectAllCheckbox label={selectLabel} allIds={allIds} selectedIds={selectedIds} onToggle={onToggleSelect} />
        </Box>
        <Accordion.Control flex={1}>
          <Group gap="xs">
            <Text fw={500} size="sm">
              {label}
            </Text>
            <Badge variant="light" size="sm">
              {itemCount}
            </Badge>
          </Group>
        </Accordion.Control>
      </Group>
      <Accordion.Panel>{children}</Accordion.Panel>
    </Accordion.Item>
  );
}

export default function ModelDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [drafts, setDrafts] = useState<ModelDefinitionDraft[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [wargearDefinitions, setWargearDefinitions] = useState<WargearDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // Which items a bulk action left behind. Why each one failed is reported by the API layer as a
  // notification, but a notification cannot usefully name five drafts, so that part is kept here.
  const [bulkFailureMessage, setBulkFailureMessage] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ModelDefinitionDraft | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [discarding, setDiscarding] = useState(false);
  const [publishingDraftIds, setPublishingDraftIds] = useState<Set<string>>(new Set());
  const [publishingSelected, setPublishingSelected] = useState(false);
  const [selectedModelDefinitionIds, setSelectedModelDefinitionIds] = useState<Set<string>>(new Set());
  const [deletingSelectedModelDefinitions, setDeletingSelectedModelDefinitions] = useState(false);
  const [diffDraft, setDiffDraft] = useState<ModelDefinitionDraft | null>(null);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadFailed(false);
      Promise.all([
        getAdminModelDefinitions({ signal, throwOnError: true }),
        getModelDefinitionDrafts({ signal, throwOnError: true }),
        getFactions({ signal, throwOnError: true }),
        getWargearDefinitions({ signal, throwOnError: true }),
      ])
        .then(([modelDefinitionsRes, draftsRes, factionsRes, wargearRes]) => {
          if (signal?.aborted) return;
          setModelDefinitions(modelDefinitionsRes.data ?? []);
          setDrafts(draftsRes.data ?? []);
          setFactions(factionsRes.data ?? []);
          setWargearDefinitions(wargearRes.data ?? []);
        })
        .catch(() => {
          // The reason arrives from the API layer as a notification; the page only has to stop
          // presenting empty lists as though there were nothing to show.
          if (!signal?.aborted) setLoadFailed(true);
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [isAdmin],
  );

  useEffect(() => {
    const ac = new AbortController();
    loadAll(ac.signal);
    return () => ac.abort();
  }, [loadAll]);

  async function handleStartEditing(modelDefinitionId: string) {
    try {
      const draft = (await startModelDefinitionDraft({ path: { modelDefinitionId }, throwOnError: true })).data;
      if (!draft) return;
      setDrafts((d) =>
        d.some((x) => x.id === draft.id) ? d.map((x) => (x.id === draft.id ? draft : x)) : [...d, draft],
      );
      setEditingDraft(draft);
    } catch {
      // Reported as a notification by the API layer; the editor stays closed.
    }
  }

  async function handleCreateNew(e: React.SubmitEvent) {
    e.preventDefault();
    try {
      const draft = (
        await createModelDefinitionDraft({
          body: { name: newName, attachmentSlots: [], wargearOptions: [] },
          throwOnError: true,
        })
      ).data;
      if (!draft) return;
      setDrafts((d) => [...d, draft]);
      setNewName("");
      closeCreate();
      setEditingDraft(draft);
    } catch {
      // Reported as a notification by the API layer. The form keeps the name that was typed, so the
      // create can be retried without entering it again.
    }
  }

  function handleDraftSaved(updated: ModelDefinitionDraft) {
    setDrafts((drafts) => drafts.map((draft) => (draft.id === updated.id ? updated : draft)));
  }

  function handleDraftDiscarded(draftId: string) {
    setDrafts((drafts) => drafts.filter((draft) => draft.id !== draftId));
    setSelectedDraftIds((ids) => {
      const next = new Set(ids);
      next.delete(draftId);
      return next;
    });
    setEditingDraft(null);
  }

  function toggleDraftSelected(draftId: string, checked: boolean) {
    setSelectedDraftIds((ids) => {
      const next = new Set(ids);
      if (checked) next.add(draftId);
      else next.delete(draftId);
      return next;
    });
  }

  function toggleDraftGroupSelected(groupDraftIds: string[], checked: boolean) {
    setSelectedDraftIds((ids) => {
      const next = new Set(ids);
      for (const id of groupDraftIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function toggleModelDefinitionSelected(modelDefinitionId: string, checked: boolean) {
    setSelectedModelDefinitionIds((ids) => {
      const next = new Set(ids);
      if (checked) next.add(modelDefinitionId);
      else next.delete(modelDefinitionId);
      return next;
    });
  }

  function toggleModelDefinitionGroupSelected(groupModelDefinitionIds: string[], checked: boolean) {
    setSelectedModelDefinitionIds((ids) => {
      const next = new Set(ids);
      for (const id of groupModelDefinitionIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleDiscardDraft(draftId: string) {
    try {
      await discardModelDefinitionDraft({ path: { draftId }, throwOnError: true });
      handleDraftDiscarded(draftId);
    } catch {
      // Reported as a notification by the API layer; the draft stays in the list.
    }
  }

  async function handleDiscardSelected() {
    const ids = [...selectedDraftIds];
    if (ids.length === 0) return;
    setBulkFailureMessage(null);
    setDiscarding(true);
    try {
      const results = await Promise.allSettled(
        ids.map((draftId) => discardModelDefinitionDraft({ path: { draftId }, throwOnError: true })),
      );
      const discarded = new Set(ids.filter((_, index) => results[index].status === "fulfilled"));
      const failedNames = ids
        .filter((draftId) => !discarded.has(draftId))
        .map((draftId) => drafts.find((draft) => draft.id === draftId)?.name ?? draftId);

      setDrafts((drafts) => drafts.filter((draft) => !discarded.has(draft.id ?? "")));
      setSelectedDraftIds((current) => new Set([...current].filter((id) => !discarded.has(id))));
      if (editingDraft && discarded.has(editingDraft.id ?? "")) {
        setEditingDraft(null);
      }
      if (failedNames.length > 0) {
        setBulkFailureMessage(
          `${failedNames.length} of ${ids.length} drafts were not discarded: ${failedNames.join(", ")}.`,
        );
      }
    } finally {
      setDiscarding(false);
    }
  }

  // Applies a successfully published model definition to state: upserts it into the
  // published list and removes the now-consumed draft (and closes the editor if it
  // happened to be open for that same draft).
  function applyPublishedModelDefinition(published: ModelDefinition, draftId: string) {
    setModelDefinitions((modelDefinitions) =>
      modelDefinitions.some((modelDefinition) => modelDefinition.id === published.id)
        ? modelDefinitions.map((modelDefinition) => (modelDefinition.id === published.id ? published : modelDefinition))
        : [...modelDefinitions, published],
    );
    setDrafts((drafts) => drafts.filter((draft) => draft.id !== draftId));
    setSelectedDraftIds((ids) => {
      const next = new Set(ids);
      next.delete(draftId);
      return next;
    });
    if (editingDraft?.id === draftId) {
      setEditingDraft(null);
    }
  }

  async function handlePublishDraft(draftId: string) {
    setPublishingDraftIds((ids) => new Set(ids).add(draftId));
    try {
      const published = (await publishModelDefinitionDraft({ path: { draftId }, body: {}, throwOnError: true })).data;
      if (!published) return;
      applyPublishedModelDefinition(published, draftId);
    } catch {
      // Reported as a notification by the API layer; the draft stays unpublished.
    } finally {
      setPublishingDraftIds((ids) => {
        const next = new Set(ids);
        next.delete(draftId);
        return next;
      });
    }
  }

  async function handlePublishSelected() {
    const ids = [...selectedDraftIds];
    if (ids.length === 0) return;
    setBulkFailureMessage(null);
    setPublishingSelected(true);
    setPublishingDraftIds((current) => new Set([...current, ...ids]));
    try {
      const results = await Promise.allSettled(
        ids.map((draftId) => publishModelDefinitionDraft({ path: { draftId }, body: {}, throwOnError: true })),
      );
      const failedNames: string[] = [];
      results.forEach((result, index) => {
        const draftId = ids[index];
        if (result.status === "fulfilled" && result.value.data) {
          applyPublishedModelDefinition(result.value.data, draftId);
        } else {
          failedNames.push(drafts.find((d) => d.id === draftId)?.name ?? draftId);
        }
      });
      if (failedNames.length > 0) {
        setBulkFailureMessage(
          `${failedNames.length} of ${ids.length} drafts were not published: ${failedNames.join(", ")}.`,
        );
      }
    } finally {
      setPublishingSelected(false);
      setPublishingDraftIds((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
    }
  }

  function handlePublished(published: ModelDefinition) {
    applyPublishedModelDefinition(published, editingDraft?.id ?? "");
  }

  async function handleDeleteModelDefinition(modelDefinitionId: string) {
    try {
      // throwOnError, or a refused delete resolves as a success and the model definition vanishes
      // from the page while staying in the catalogue until the next reload.
      await deleteModelDefinition({ path: { modelDefinitionId }, throwOnError: true });
      setModelDefinitions((mds) => mds.filter((md) => md.id !== modelDefinitionId));
      setDrafts((d) => d.filter((draft) => draft.publishedModelDefinitionId !== modelDefinitionId));
      setSelectedModelDefinitionIds((ids) => {
        const next = new Set(ids);
        next.delete(modelDefinitionId);
        return next;
      });
    } catch {
      // Reported as a notification by the API layer; the model definition stays in the list.
    }
  }

  async function handleDeleteSelectedModelDefinitions() {
    const ids = [...selectedModelDefinitionIds];
    if (ids.length === 0) return;
    setBulkFailureMessage(null);
    setDeletingSelectedModelDefinitions(true);
    try {
      const results = await Promise.allSettled(
        ids.map((modelDefinitionId) => deleteModelDefinition({ path: { modelDefinitionId }, throwOnError: true })),
      );
      const failedNames: string[] = [];
      const deletedIds = new Set<string>();
      results.forEach((result, index) => {
        const modelDefinitionId = ids[index];
        if (result.status === "fulfilled") {
          deletedIds.add(modelDefinitionId);
        } else {
          failedNames.push(modelDefinitions.find((md) => md.id === modelDefinitionId)?.name ?? modelDefinitionId);
        }
      });
      setModelDefinitions((mds) => mds.filter((md) => !deletedIds.has(md.id ?? "")));
      setDrafts((d) => d.filter((draft) => !deletedIds.has(draft.publishedModelDefinitionId ?? "")));
      setSelectedModelDefinitionIds((current) => {
        const next = new Set(current);
        for (const id of deletedIds) next.delete(id);
        return next;
      });
      if (failedNames.length > 0) {
        setBulkFailureMessage(
          `${failedNames.length} of ${ids.length} model definitions were not deleted: ${failedNames.join(", ")}.`,
        );
      }
    } finally {
      setDeletingSelectedModelDefinitions(false);
    }
  }

  async function handleImported(importedDrafts: ModelDefinitionDraft[], parsed: ModelDefinitionExport) {
    setDrafts((drafts) => {
      const byId = new Map(drafts.map((draft) => [draft.id, draft]));
      for (const draft of importedDrafts) {
        byId.set(draft.id, draft);
      }
      return [...byId.values()];
    });
    const total = parsed.modelDefinitions?.length ?? 0;
    const changed = importedDrafts.length;
    setImportSummary(
      changed === 0
        ? `Imported ${total} model definition(s) — everything was already up to date, so there is nothing to review.`
        : `Imported ${total} model definition(s) — ${changed} with changes to review, ${total - changed} already up to date.`,
    );
  }

  const factionsById = useMemo(() => new Map(factions.map((faction) => [faction.id ?? "", faction])), [factions]);
  const modelDefinitionsById = useMemo(
    () => new Map(modelDefinitions.map((definition) => [definition.id ?? "", definition])),
    [modelDefinitions],
  );
  const diffsByDraftId = useMemo(
    () =>
      new Map(
        drafts.map((draft) => [
          draft.id ?? "",
          diffModelDefinitionDraft(
            draft,
            draft.publishedModelDefinitionId ? modelDefinitionsById.get(draft.publishedModelDefinitionId) : undefined,
            factionsById,
          ),
        ]),
      ),
    [drafts, modelDefinitionsById, factionsById],
  );
  const draftGroups = useMemo(() => groupByFaction(drafts, factionsById), [drafts, factionsById]);
  const modelDefinitionGroups = useMemo(
    () => groupByFaction(modelDefinitions, factionsById),
    [modelDefinitions, factionsById],
  );
  const allDraftIds = useMemo(
    () => drafts.map((draft) => draft.id).filter((id): id is string => Boolean(id)),
    [drafts],
  );
  const allPublishedIds = useMemo(
    () => modelDefinitions.map((definition) => definition.id).filter((id): id is string => Boolean(id)),
    [modelDefinitions],
  );

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Model Definitions</Title>
          <Text c="dimmed">
            Create and edit model types available to users. Changes stay as drafts until you publish them.
          </Text>
        </div>
        {isAdmin && (
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Create new
            </Button>
            <DefinitionTransferButtons
              fileNamePrefix="model-definitions"
              onStart={() => setImportSummary(null)}
              onExport={async () => (await exportModelDefinitions({ throwOnError: true })).data}
              onImport={async (document) => (await importModelDefinitions({ body: document, throwOnError: true })).data}
              onImported={handleImported}
            />
          </Group>
        )}
      </Group>

      {loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          The model definitions could not be loaded. Reload the page to try again.
        </Alert>
      )}

      {bulkFailureMessage && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          withCloseButton
          onClose={() => setBulkFailureMessage(null)}
        >
          {bulkFailureMessage}
        </Alert>
      )}

      {importSummary && (
        <Alert color="blue" icon={<IconCircleCheck size={16} />} withCloseButton onClose={() => setImportSummary(null)}>
          {importSummary}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
        <Stack gap="lg">
          {drafts.length > 0 && (
            <div>
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <SelectAllCheckbox
                    label="Select all drafts"
                    allIds={allDraftIds}
                    selectedIds={selectedDraftIds}
                    onToggle={toggleDraftGroupSelected}
                  />
                  <Title order={4}>Open drafts</Title>
                </Group>
                {selectedDraftIds.size > 0 && (
                  <Group gap="xs">
                    <Button
                      size="xs"
                      color="green"
                      leftSection={<IconCircleCheck size={14} />}
                      loading={publishingSelected}
                      onClick={handlePublishSelected}
                    >
                      Publish selected ({selectedDraftIds.size})
                    </Button>
                    <Button
                      size="xs"
                      color="red"
                      variant="light"
                      leftSection={<IconTrash size={14} />}
                      loading={discarding}
                      onClick={handleDiscardSelected}
                    >
                      Discard selected ({selectedDraftIds.size})
                    </Button>
                  </Group>
                )}
              </Group>
              <Accordion multiple defaultValue={[]} variant="separated">
                {draftGroups.map((group) => {
                  const groupDraftIds = group.items.map((d) => d.id ?? "").filter(Boolean);
                  const groupLabel = group.faction?.name ?? UNCATEGORISED_LABEL;
                  const groupKey = group.key || "uncategorised";
                  return (
                    <FactionGroupSection
                      key={groupKey}
                      groupKey={groupKey}
                      label={groupLabel}
                      itemCount={group.items.length}
                      selectLabel={`Select all drafts in ${groupLabel}`}
                      allIds={groupDraftIds}
                      selectedIds={selectedDraftIds}
                      onToggleSelect={toggleDraftGroupSelected}
                    >
                      <ResponsiveTable striped withTableBorder verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: 32 }}>
                              <SelectAllCheckbox
                                label={`Select all drafts in ${groupLabel}`}
                                allIds={groupDraftIds}
                                selectedIds={selectedDraftIds}
                                onToggle={toggleDraftGroupSelected}
                              />
                            </Table.Th>
                            <Table.Th>Name</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {group.items.map((draft) => {
                            const draftId = draft.id ?? "";
                            const diff = diffsByDraftId.get(draftId);
                            return (
                              <Table.Tr key={draft.id}>
                                <Table.Td>
                                  <Checkbox
                                    aria-label={`Select draft ${draft.name}`}
                                    checked={selectedDraftIds.has(draftId)}
                                    onChange={(e) => toggleDraftSelected(draftId, e.currentTarget.checked)}
                                  />
                                </Table.Td>
                                <Table.Td>{draft.name}</Table.Td>
                                <Table.Td>
                                  <DraftStatusBadge diff={diff} />
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                                    <Tooltip label="View changes">
                                      <ActionIcon
                                        variant="subtle"
                                        aria-label="View changes"
                                        onClick={() => setDiffDraft(draft)}
                                      >
                                        <IconGitCompare size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Publish">
                                      <ActionIcon
                                        color="green"
                                        variant="light"
                                        aria-label="Publish draft"
                                        loading={publishingDraftIds.has(draftId)}
                                        onClick={() => handlePublishDraft(draftId)}
                                      >
                                        <IconCircleCheck size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Resume editing">
                                      <ActionIcon
                                        variant="light"
                                        aria-label="Resume editing"
                                        onClick={() => setEditingDraft(draft)}
                                      >
                                        <IconPencil size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Discard draft">
                                      <ActionIcon
                                        color="red"
                                        variant="subtle"
                                        aria-label="Discard draft"
                                        onClick={() => handleDiscardDraft(draftId)}
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </ResponsiveTable>
                    </FactionGroupSection>
                  );
                })}
              </Accordion>
            </div>
          )}

          <div>
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <SelectAllCheckbox
                  label="Select all published model definitions"
                  allIds={allPublishedIds}
                  selectedIds={selectedModelDefinitionIds}
                  onToggle={toggleModelDefinitionGroupSelected}
                />
                <Title order={4}>Published</Title>
              </Group>
              {selectedModelDefinitionIds.size > 0 && (
                <Button
                  size="xs"
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={14} />}
                  loading={deletingSelectedModelDefinitions}
                  onClick={handleDeleteSelectedModelDefinitions}
                >
                  Delete selected ({selectedModelDefinitionIds.size})
                </Button>
              )}
            </Group>
            {modelDefinitions.length === 0 ? (
              // Silent when the load failed: the alert above already explains the empty list, and
              // "none exist yet" would be stating something the page does not know.
              !loadFailed && <Text c="dimmed">No model definitions exist yet.</Text>
            ) : (
              <Accordion multiple defaultValue={[]} variant="separated">
                {modelDefinitionGroups.map((group) => {
                  const groupModelDefinitionIds = group.items.map((md) => md.id ?? "").filter(Boolean);
                  const groupLabel = group.faction?.name ?? UNCATEGORISED_LABEL;
                  const groupKey = group.key || "uncategorised";
                  return (
                    <FactionGroupSection
                      key={groupKey}
                      groupKey={groupKey}
                      label={groupLabel}
                      itemCount={group.items.length}
                      selectLabel={`Select all in ${groupLabel}`}
                      allIds={groupModelDefinitionIds}
                      selectedIds={selectedModelDefinitionIds}
                      onToggleSelect={toggleModelDefinitionGroupSelected}
                    >
                      <Accordion multiple defaultValue={[]} variant="separated">
                        {group.items.map((md) => {
                          const attachmentSlots = md.attachmentSlots ?? [];
                          const wargearOptions = md.wargearOptions ?? [];
                          return (
                            <Accordion.Item key={md.id} value={md.id ?? ""}>
                              <Group gap="xs" wrap="nowrap" pr="xs">
                                <Checkbox
                                  ml="md"
                                  aria-label={`Select ${md.name}`}
                                  checked={selectedModelDefinitionIds.has(md.id ?? "")}
                                  onChange={(e) => toggleModelDefinitionSelected(md.id ?? "", e.currentTarget.checked)}
                                />
                                <Accordion.Control flex={1}>
                                  <Group gap="xs">
                                    <Text fw={500}>{md.name}</Text>
                                    <Badge variant="outline" size="sm">
                                      v{md.version}
                                    </Badge>
                                    {attachmentSlots.length > 0 && (
                                      <Badge variant="light">
                                        {attachmentSlots.length} slot{attachmentSlots.length === 1 ? "" : "s"}
                                      </Badge>
                                    )}
                                  </Group>
                                </Accordion.Control>
                                <Group gap="xs" wrap="nowrap">
                                  <Button
                                    size="xs"
                                    variant="light"
                                    onClick={() => {
                                      if (md.id) handleStartEditing(md.id);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Tooltip label="Delete model definition">
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      aria-label="Delete model definition"
                                      onClick={() => {
                                        if (md.id) handleDeleteModelDefinition(md.id);
                                      }}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </Group>
                              <Accordion.Panel>
                                {md.description && (
                                  <Text size="sm" c="dimmed" mb="sm">
                                    {md.description}
                                  </Text>
                                )}
                                <ModelDefinitionSlotTable
                                  attachmentSlots={attachmentSlots}
                                  wargearOptions={wargearOptions}
                                />
                              </Accordion.Panel>
                            </Accordion.Item>
                          );
                        })}
                      </Accordion>
                    </FactionGroupSection>
                  );
                })}
              </Accordion>
            )}
          </div>
        </Stack>
      </AdminPageGate>

      <Modal opened={createOpened} onClose={closeCreate} title="Create new model definition">
        <form onSubmit={handleCreateNew}>
          <Stack>
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
            <Group justify="flex-end">
              <Button type="submit">Create draft</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {editingDraft && (
        <ModelDefinitionDraftEditor
          draft={editingDraft}
          factions={factions}
          wargearDefinitions={wargearDefinitions}
          onClose={() => setEditingDraft(null)}
          onSaved={handleDraftSaved}
          onPublished={handlePublished}
          onDiscarded={handleDraftDiscarded}
        />
      )}
      <DefinitionDiffModal
        opened={diffDraft !== null}
        onClose={() => setDiffDraft(null)}
        definitionName={diffDraft?.name ?? ""}
        diff={diffDraft ? (diffsByDraftId.get(diffDraft.id ?? "") ?? null) : null}
        labels={DRAFT_DIFF_LABELS}
      />
    </Stack>
  );
}
