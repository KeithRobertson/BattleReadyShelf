import {
  ActionIcon,
  Accordion,
  Alert,
  Badge,
  Button,
  Checkbox,
  FileButton,
  Group,
  Loader,
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
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { isAxiosError } from "axios";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import ModelDefinitionDraftEditor from "../components/ModelDefinitionDraftEditor";
import type { ModelDefinition, ModelDefinitionDraft, ModelDefinitionExport } from "../generated";
import {
  createModelDefinitionDraft,
  deleteModelDefinition,
  discardModelDefinitionDraft,
  exportModelDefinitions,
  getModelDefinitionDrafts,
  getModelDefinitions,
  importModelDefinitions,
  startModelDefinitionDraft,
} from "../generated";

export default function ModelDefinitionsAdminPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN";
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [drafts, setDrafts] = useState<ModelDefinitionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<ModelDefinitionDraft | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<Set<string>>(new Set());
  const [discarding, setDiscarding] = useState(false);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([getModelDefinitions({ signal }), getModelDefinitionDrafts({ signal })])
        .then(([modelDefinitionsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setModelDefinitions(modelDefinitionsRes.data ?? []);
          setDrafts(draftsRes.data ?? []);
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
      if (!draft) throw new Error("Failed to start draft");
      setDrafts((d) => (d.some((x) => x.id === draft.id) ? d.map((x) => (x.id === draft.id ? draft : x)) : [...d, draft]));
      setEditingDraft(draft);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const draft = (
        await createModelDefinitionDraft({
          body: { name: newName, attachmentSlots: [], wargearOptions: [] },
        })
      ).data;
      if (!draft) throw new Error("Failed to create draft");
      setDrafts((d) => [...d, draft]);
      setNewName("");
      closeCreate();
      setEditingDraft(draft);
    } catch (e) {
      setError(String(e));
    }
  }

  function handleDraftSaved(updated: ModelDefinitionDraft) {
    setDrafts((d) => d.map((x) => (x.id === updated.id ? updated : x)));
  }

  function handleDraftDiscarded(draftId: string) {
    setDrafts((d) => d.filter((x) => x.id !== draftId));
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

  function toggleAllDraftsSelected(checked: boolean) {
    setSelectedDraftIds(checked ? new Set(drafts.map((d) => d.id ?? "")) : new Set());
  }

  async function handleDiscardDraft(draftId: string) {
    if (!window.confirm("Discard this draft? This cannot be undone.")) return;
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
    if (
      !window.confirm(
        `Discard ${ids.length} selected draft${ids.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    )
      return;
    setError(null);
    setDiscarding(true);
    try {
      await Promise.all(ids.map((draftId) => discardModelDefinitionDraft({ path: { draftId } })));
      setDrafts((d) => d.filter((x) => !selectedDraftIds.has(x.id ?? "")));
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

  function handlePublished(published: ModelDefinition) {
    setModelDefinitions((mds) =>
      mds.some((md) => md.id === published.id)
        ? mds.map((md) => (md.id === published.id ? published : md))
        : [...mds, published],
    );
    setDrafts((d) => d.filter((x) => x.id !== editingDraft?.id));
    setEditingDraft(null);
  }

  function extractErrorMessage(e: unknown): string {
    if (isAxiosError(e) && typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    return String(e);
  }

  async function handleDeleteModelDefinition(modelDefinitionId: string) {
    if (
      !window.confirm(
        "Permanently delete this model definition? This cannot be undone and will remove its slots, wargear options, and publish history.",
      )
    )
      return;
    setError(null);
    try {
      await deleteModelDefinition({ path: { modelDefinitionId } });
      setModelDefinitions((mds) => mds.filter((md) => md.id !== modelDefinitionId));
      setDrafts((d) => d.filter((draft) => draft.publishedModelDefinitionId !== modelDefinitionId));
    } catch (e) {
      setError(extractErrorMessage(e));
    }
  }

  async function handleExport() {
    setError(null);
    try {
      const exportData = (await exportModelDefinitions()).data;
      if (!exportData) throw new Error("Failed to export model definitions");
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
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ModelDefinitionExport;
      const importedDrafts = (await importModelDefinitions({ body: parsed })).data;
      if (importedDrafts) {
        setDrafts((d) => {
          const byId = new Map(d.map((x) => [x.id, x]));
          for (const draft of importedDrafts) {
            byId.set(draft.id, draft);
          }
          return [...byId.values()];
        });
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setImporting(false);
    }
  }

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
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated || !isAdmin ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          You do not have permission to view this page.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : (
        <Stack gap="lg">
          {drafts.length > 0 && (
            <div>
              <Group justify="space-between" mb="xs">
                <Title order={4}>Open drafts</Title>
                {selectedDraftIds.size > 0 && (
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
                )}
              </Group>
              <Table striped withTableBorder verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 32 }}>
                      <Checkbox
                        aria-label="Select all drafts"
                        checked={drafts.length > 0 && selectedDraftIds.size === drafts.length}
                        indeterminate={selectedDraftIds.size > 0 && selectedDraftIds.size < drafts.length}
                        onChange={(e) => toggleAllDraftsSelected(e.currentTarget.checked)}
                      />
                    </Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {drafts.map((draft) => {
                    const draftId = draft.id ?? "";
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
                          <Badge variant="light" color={draft.publishedModelDefinitionId ? "blue" : "grape"}>
                            {draft.publishedModelDefinitionId ? "Editing published" : "New"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs" justify="flex-end" wrap="nowrap">
                            <Button size="xs" variant="light" onClick={() => setEditingDraft(draft)}>
                              Resume editing
                            </Button>
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
          )}

          <div>
            <Title order={4} mb="xs">
              Published
            </Title>
            {modelDefinitions.length === 0 ? (
              <Text c="dimmed">No model definitions exist yet.</Text>
            ) : (
              <Accordion multiple defaultValue={modelDefinitions.map((md) => md.id ?? "")} variant="separated">
                {modelDefinitions.map((md) => {
                  const attachmentSlots = md.attachmentSlots ?? [];
                  const wargearOptions = md.wargearOptions ?? [];
                  return (
                    <Accordion.Item key={md.id} value={md.id ?? ""}>
                      <Accordion.Control>
                        <Group gap="xs" justify="space-between" pr="md">
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
                        {attachmentSlots.length === 0 ? (
                          <Text c="dimmed" size="sm">
                            No attachment slots defined for this model.
                          </Text>
                        ) : (
                          <Table striped withTableBorder verticalSpacing="xs">
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>Attachment slot</Table.Th>
                                <Table.Th>Wargear options</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {attachmentSlots.map((slot) => {
                                const optionsForSlot = wargearOptions.filter((option) =>
                                  option.attachmentSlotIds?.includes(slot.id ?? ""),
                                );
                                return (
                                  <Table.Tr key={slot.id}>
                                    <Table.Td>{slot.name}</Table.Td>
                                    <Table.Td>
                                      {optionsForSlot.length === 0 ? (
                                        <Text c="dimmed" size="sm">
                                          None
                                        </Text>
                                      ) : (
                                        <Group gap={4}>
                                          {optionsForSlot.map((option) => (
                                            <Badge
                                              key={option.id}
                                              variant={option.isDefault ? "filled" : "light"}
                                              size="sm"
                                              title={option.isDefault ? "Default" : undefined}
                                            >
                                              {option.name}
                                            </Badge>
                                          ))}
                                        </Group>
                                      )}
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              })}
                            </Table.Tbody>
                          </Table>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            )}
          </div>
        </Stack>
      )}

      <Modal opened={createOpened} onClose={closeCreate} title="Create new model definition">
        <form onSubmit={handleCreateNew}>
          <Stack>
            <TextInput
              label="Name"
              value={newName}
              onChange={(e) => setNewName(e.currentTarget.value)}
              required
            />
            <Group justify="flex-end">
              <Button type="submit">Create draft</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {editingDraft && (
        <ModelDefinitionDraftEditor
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSaved={handleDraftSaved}
          onPublished={handlePublished}
          onDiscarded={handleDraftDiscarded}
        />
      )}
    </Stack>
  );
}
