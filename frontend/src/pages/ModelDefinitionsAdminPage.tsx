import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileButton,
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
import {
  IconAlertCircle,
  IconCircleCheck,
  IconDownload,
  IconGitCompare,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { isAxiosError } from "axios";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import ModelDefinitionDraftDiffModal from "@/components/admin/modeldefinitions/ModelDefinitionDraftDiffModal.tsx";
import ModelDefinitionDraftEditor from "@/components/admin/modeldefinitions/ModelDefinitionDraftEditor.tsx";
import ModelDefinitionSlotTable from "@/components/admin/modeldefinitions/ModelDefinitionSlotTable.tsx";
import type { Faction, ModelDefinition, ModelDefinitionDraft, ModelDefinitionExport, WargearDefinition } from "@/generated";
import {
  createModelDefinitionDraft,
  deleteModelDefinition,
  discardModelDefinitionDraft,
  exportModelDefinitions,
  getFactions,
  getModelDefinitionDrafts,
  getModelDefinitions,
  getWargearDefinitions,
  importModelDefinitions,
  publishModelDefinitionDraft,
  startModelDefinitionDraft,
} from "@/generated";
import { type DraftDiff, diffModelDefinitionDraft } from "@/utils/modelDefinitionDraftDiff";

interface FactionGroup<T> {
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

function extractErrorMessage(e: unknown): string {
  if (isAxiosError(e) && typeof e.response?.data?.message === "string") {
    return e.response.data.message;
  }
  return String(e);
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

export default function ModelDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [drafts, setDrafts] = useState<ModelDefinitionDraft[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [wargearDefinitions, setWargearDefinitions] = useState<WargearDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ModelDefinitionDraft | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
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
      Promise.all([
        getModelDefinitions({ signal }),
        getModelDefinitionDrafts({ signal }),
        getFactions({ signal }),
        getWargearDefinitions({ signal }),
      ])
        .then(([modelDefinitionsRes, draftsRes, factionsRes, wargearRes]) => {
          if (signal?.aborted) return;
          setModelDefinitions(modelDefinitionsRes.data ?? []);
          setDrafts(draftsRes.data ?? []);
          setFactions(factionsRes.data ?? []);
          setWargearDefinitions(wargearRes.data ?? []);
        })
        .catch((e) => {
          if (!signal?.aborted) setError(String(e));
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
    setError(null);
    try {
      const draft = (await startModelDefinitionDraft({ path: { modelDefinitionId } })).data;
      if (!draft) {
        setError("Failed to start draft");
        return;
      }
      setDrafts((d) =>
        d.some((x) => x.id === draft.id) ? d.map((x) => (x.id === draft.id ? draft : x)) : [...d, draft],
      );
      setEditingDraft(draft);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleCreateNew(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      const draft = (
        await createModelDefinitionDraft({
          body: { name: newName, attachmentSlots: [], wargearOptions: [] },
        })
      ).data;
      if (!draft) {
        setError("Failed to create draft");
        return;
      }
      setDrafts((d) => [...d, draft]);
      setNewName("");
      closeCreate();
      setEditingDraft(draft);
    } catch (e) {
      setError(String(e));
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
    setError(null);
    try {
      await discardModelDefinitionDraft({ path: { draftId } });
      handleDraftDiscarded(draftId);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDiscardSelected() {
    const ids = [...selectedDraftIds];
    if (ids.length === 0) return;
    setError(null);
    setDiscarding(true);
    try {
      await Promise.all(ids.map((draftId) => discardModelDefinitionDraft({ path: { draftId } })));
      setDrafts((drafts) => drafts.filter((draft) => !selectedDraftIds.has(draft.id ?? "")));
      setSelectedDraftIds(new Set());
      if (editingDraft && selectedDraftIds.has(editingDraft.id ?? "")) {
        setEditingDraft(null);
      }
    } catch (e) {
      setError(String(e));
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
    setError(null);
    setPublishingDraftIds((ids) => new Set(ids).add(draftId));
    try {
      const published = (await publishModelDefinitionDraft({ path: { draftId }, body: {} })).data;
      if (!published) {
        setError("Failed to publish draft");
        return;
      }
      applyPublishedModelDefinition(published, draftId);
    } catch (e) {
      setError(extractErrorMessage(e));
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
    setError(null);
    setPublishingSelected(true);
    setPublishingDraftIds((current) => new Set([...current, ...ids]));
    try {
      const results = await Promise.allSettled(
        ids.map((draftId) => publishModelDefinitionDraft({ path: { draftId }, body: {} })),
      );
      const failures: string[] = [];
      results.forEach((result, index) => {
        const draftId = ids[index];
        if (result.status === "fulfilled" && result.value.data) {
          applyPublishedModelDefinition(result.value.data, draftId);
        } else {
          const draftName = drafts.find((d) => d.id === draftId)?.name ?? draftId;
          const reason = result.status === "rejected" ? extractErrorMessage(result.reason) : "Unknown error";
          failures.push(`${draftName}: ${reason}`);
        }
      });
      if (failures.length > 0) {
        setError(`Failed to publish ${failures.length} draft(s):\n${failures.join("\n")}`);
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
    setError(null);
    try {
      await deleteModelDefinition({ path: { modelDefinitionId } });
      setModelDefinitions((mds) => mds.filter((md) => md.id !== modelDefinitionId));
      setDrafts((d) => d.filter((draft) => draft.publishedModelDefinitionId !== modelDefinitionId));
      setSelectedModelDefinitionIds((ids) => {
        const next = new Set(ids);
        next.delete(modelDefinitionId);
        return next;
      });
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  }

  async function handleDeleteSelectedModelDefinitions() {
    const ids = [...selectedModelDefinitionIds];
    if (ids.length === 0) return;
    setError(null);
    setDeletingSelectedModelDefinitions(true);
    try {
      const results = await Promise.allSettled(
        ids.map((modelDefinitionId) => deleteModelDefinition({ path: { modelDefinitionId } })),
      );
      const failures: string[] = [];
      const deletedIds = new Set<string>();
      results.forEach((result, index) => {
        const modelDefinitionId = ids[index];
        if (result.status === "fulfilled") {
          deletedIds.add(modelDefinitionId);
        } else {
          const name = modelDefinitions.find((md) => md.id === modelDefinitionId)?.name ?? modelDefinitionId;
          failures.push(`${name}: ${extractErrorMessage(result.reason)}`);
        }
      });
      setModelDefinitions((mds) => mds.filter((md) => !deletedIds.has(md.id ?? "")));
      setDrafts((d) => d.filter((draft) => !deletedIds.has(draft.publishedModelDefinitionId ?? "")));
      setSelectedModelDefinitionIds((current) => {
        const next = new Set(current);
        for (const id of deletedIds) next.delete(id);
        return next;
      });
      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} model definition(s):\n${failures.join("\n")}`);
      }
    } finally {
      setDeletingSelectedModelDefinitions(false);
    }
  }

  async function handleExport() {
    setError(null);
    try {
      const exportData = (await exportModelDefinitions()).data;
      if (!exportData) {
        setError("Failed to export model definitions");
        return;
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `model-definitions-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    setError(null);
    setImportSummary(null);
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ModelDefinitionExport;
      const importedDrafts = (await importModelDefinitions({ body: parsed })).data;
      if (importedDrafts) {
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
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
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
            <Button leftSection={<IconDownload size={16} />} variant="default" onClick={handleExport}>
              Export
            </Button>
            <FileButton onChange={handleImportFile} accept="application/json">
              {(props) => (
                <Button leftSection={<IconUpload size={16} />} variant="default" loading={importing} {...props}>
                  Import
                </Button>
              )}
            </FileButton>
          </Group>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
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
                <Title order={4}>Open drafts</Title>
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
              <Stack gap="md">
                {draftGroups.map((group) => {
                  const groupDraftIds = group.items.map((d) => d.id ?? "");
                  const groupSelectedCount = groupDraftIds.filter((id) => selectedDraftIds.has(id)).length;
                  return (
                    <div key={group.faction?.id ?? UNCATEGORISED_LABEL}>
                      <Text fw={500} size="sm" c="dimmed" mb={4}>
                        {group.faction?.name ?? UNCATEGORISED_LABEL}
                      </Text>
                      <Table striped withTableBorder verticalSpacing="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ width: 32 }}>
                              <Checkbox
                                aria-label={`Select all drafts in ${group.faction?.name ?? UNCATEGORISED_LABEL}`}
                                checked={groupDraftIds.length > 0 && groupSelectedCount === groupDraftIds.length}
                                indeterminate={groupSelectedCount > 0 && groupSelectedCount < groupDraftIds.length}
                                onChange={(e) => toggleDraftGroupSelected(groupDraftIds, e.currentTarget.checked)}
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
                      </Table>
                    </div>
                  );
                })}
              </Stack>
            </div>
          )}

          <div>
            <Group justify="space-between" mb="xs">
              <Title order={4}>Published</Title>
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
              <Text c="dimmed">No model definitions exist yet.</Text>
            ) : (
              <Stack gap="md">
                {modelDefinitionGroups.map((group) => {
                  const groupModelDefinitionIds = group.items.map((md) => md.id ?? "");
                  const groupSelectedCount = groupModelDefinitionIds.filter((id) =>
                    selectedModelDefinitionIds.has(id),
                  ).length;
                  return (
                    <div key={group.faction?.id ?? UNCATEGORISED_LABEL}>
                      <Group gap="xs" mb={4}>
                        <Checkbox
                          aria-label={`Select all in ${group.faction?.name ?? UNCATEGORISED_LABEL}`}
                          checked={
                            groupModelDefinitionIds.length > 0 && groupSelectedCount === groupModelDefinitionIds.length
                          }
                          indeterminate={groupSelectedCount > 0 && groupSelectedCount < groupModelDefinitionIds.length}
                          onChange={(e) =>
                            toggleModelDefinitionGroupSelected(groupModelDefinitionIds, e.currentTarget.checked)
                          }
                        />
                        <Text fw={500} size="sm" c="dimmed">
                          {group.faction?.name ?? UNCATEGORISED_LABEL}
                        </Text>
                      </Group>
                      <Accordion multiple defaultValue={group.items.map((md) => md.id ?? "")} variant="separated">
                        {group.items.map((md) => {
                          const attachmentSlots = md.attachmentSlots ?? [];
                          const wargearOptions = md.wargearOptions ?? [];
                          return (
                            <Accordion.Item key={md.id} value={md.id ?? ""}>
                              <Accordion.Control>
                                <Group gap="xs" justify="space-between" pr="md">
                                  <Group gap="xs">
                                    <Checkbox
                                      aria-label={`Select ${md.name}`}
                                      checked={selectedModelDefinitionIds.has(md.id ?? "")}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) =>
                                        toggleModelDefinitionSelected(md.id ?? "", e.currentTarget.checked)
                                      }
                                    />
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
                                  <Group gap="xs" wrap="nowrap">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      onClick={(e) => {
                                        e.stopPropagation();
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (md.id) handleDeleteModelDefinition(md.id);
                                        }}
                                      >
                                        <IconTrash size={16} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Group>
                              </Accordion.Control>
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
                    </div>
                  );
                })}
              </Stack>
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
      <ModelDefinitionDraftDiffModal
        opened={diffDraft !== null}
        onClose={() => setDiffDraft(null)}
        draftName={diffDraft?.name ?? ""}
        diff={diffDraft ? (diffsByDraftId.get(diffDraft.id ?? "") ?? null) : null}
      />
    </Stack>
  );
}
