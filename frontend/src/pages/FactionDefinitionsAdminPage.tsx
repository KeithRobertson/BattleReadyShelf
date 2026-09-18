import { ActionIcon, Alert, Button, Group, Modal, Select, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { AdminHealthAside } from "@/components/admin/aside/AdminHealthAside.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import PendingChangesPanel, { type PendingChangeRow } from "@/components/admin/PendingChangesPanel.tsx";
import PublishHistoryModal from "@/components/admin/PublishHistoryModal.tsx";
import usePublishHistory from "@/components/admin/usePublishHistory.ts";
import FactionFormModal from "@/components/definitions/FactionFormModal.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { Faction, FactionDraft, FactionImportResult } from "@/generated";
import {
  createFaction,
  deleteFaction,
  discardFactionDraft,
  exportFactions,
  getFactionDrafts,
  getFactionPublishHistory,
  getFactions,
  importFactions,
  proposeFactionChange,
  publishFactionDraft,
} from "@/generated";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { countFactionParents } from "@/utils/admin/catalogueStats";

/** How many model definitions a rename or reparent will carry with it. */
function factionUsageWarning(usageCount: number) {
  if (usageCount === 0) {
    return "No model definitions sit under this faction yet.";
  }
  if (usageCount === 1) {
    return "1 model definition sits under this faction and moves with it.";
  }
  return `${usageCount} model definitions sit under this faction and move with it.`;
}

/** A pending change rendered as only the fields that actually move. */
function toPendingRow(draft: FactionDraft, nameOf: (factionId?: string | null) => string | null): PendingChangeRow {
  const fields = [];
  if (draft.currentName !== draft.proposedName) {
    fields.push({ label: "Name", before: draft.currentName, after: draft.proposedName });
  }
  if ((draft.currentParentFactionId ?? null) !== (draft.proposedParentFactionId ?? null)) {
    fields.push({
      label: "Parent",
      before: nameOf(draft.currentParentFactionId),
      after: nameOf(draft.proposedParentFactionId),
    });
  }
  return {
    id: draft.id ?? "",
    currentName: draft.currentName,
    externalId: draft.externalId,
    origin: draft.origin,
    usageCount: draft.usageCount,
    fields,
  };
}

export default function FactionDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [factions, setFactions] = useState<Faction[]>([]);
  const [drafts, setDrafts] = useState<FactionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [newExternalId, setNewExternalId] = useState("");
  const [newParentFactionId, setNewParentFactionId] = useState<string | null>(null);
  const [deletingFactionId, setDeletingFactionId] = useState("");
  const [editing, setEditing] = useState<Faction | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadFailed(false);
      Promise.all([getFactions({ signal, throwOnError: true }), getFactionDrafts({ signal, throwOnError: true })])
        .then(([factionsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setFactions(factionsRes.data ?? []);
          setDrafts(draftsRes.data ?? []);
        })
        .catch(() => {
          // The reason arrives from the API layer as a notification; the page only has to stop
          // presenting an empty list as though there were nothing to show.
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

  const factionById = useMemo(() => new Map(factions.map((f) => [f.id, f])), [factions]);
  const nameOf = useCallback(
    (factionId?: string | null) => (factionId ? (factionById.get(factionId)?.name ?? factionId) : null),
    [factionById],
  );
  const pendingRows = useMemo(() => drafts.map((draft) => toPendingRow(draft, nameOf)), [drafts, nameOf]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const usageByFactionId = useMemo(
    () => new Map(drafts.map((draft) => [draft.factionId, draft.usageCount ?? 0])),
    [drafts],
  );

  const history = usePublishHistory(
    useCallback(
      async (factionId: string) =>
        (await getFactionPublishHistory({ path: { factionId }, throwOnError: true })).data ?? [],
      [],
    ),
  );

  function handleViewHistory(row: PendingChangeRow) {
    const draft = draftById.get(row.id);
    if (draft?.factionId) history.open(draft.factionId, draft.currentName);
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    try {
      const newFaction = (
        await createFaction({
          body: { name: newName, externalId: newExternalId, parentFactionId: newParentFactionId },
          throwOnError: true,
        })
      ).data;
      if (!newFaction) return;
      setFactions((prev) => [...prev, newFaction]);
      setNewName("");
      setNewExternalId("");
      setNewParentFactionId(null);
      closeCreate();
    } catch {
      // Reported as a notification by the API layer. The form keeps what was typed, so the create
      // can be retried without filling it in again.
    }
  }

  async function handleProposeChange(name: string, parentFactionId: string | null) {
    const faction = editing;
    if (!faction?.id) return;
    setSaving(true);
    try {
      const staged = (
        await proposeFactionChange({
          path: { factionId: faction.id },
          body: { name, parentFactionId },
          throwOnError: true,
        })
      ).data;
      // Nothing is applied until the change is accepted. No body back means the proposal matched
      // what is already published, which also clears any stale pending change.
      setDrafts((prev) => {
        const others = prev.filter((draft) => draft.factionId !== faction.id);
        return staged ? [...others, staged] : others;
      });
      setEditing(null);
    } catch {
      // Reported as a notification by the API layer; the modal stays open on the proposed change.
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptDraft(row: PendingChangeRow) {
    setBusyDraftId(row.id);
    try {
      const updated = (await publishFactionDraft({ path: { draftId: row.id }, throwOnError: true })).data;
      if (!updated) return;
      setFactions((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
    } catch {
      // Reported as a notification by the API layer; the proposal stays pending.
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleRejectDraft(row: PendingChangeRow) {
    setBusyDraftId(row.id);
    try {
      await discardFactionDraft({ path: { draftId: row.id }, throwOnError: true });
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
    } catch {
      // Reported as a notification by the API layer; the proposal stays pending.
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleDeleteFaction(factionId: string) {
    try {
      setDeletingFactionId(factionId);
      // throwOnError, or a refused delete resolves as a success and the faction vanishes from the
      // page while staying in the database until the next reload.
      await deleteFaction({ path: { factionId }, throwOnError: true });
      setFactions((prev) => prev.filter((f) => f.id !== factionId));
      setDrafts((prev) => prev.filter((d) => d.factionId !== factionId));
    } catch {
      // Reported as a notification by the API layer; the faction stays in the list.
    } finally {
      setDeletingFactionId("");
    }
  }

  function handleImported(result: FactionImportResult) {
    const created = result.created ?? [];
    const pending = result.pendingChanges ?? [];
    setFactions((prev) => [...prev, ...created]);
    // A re-import can clear proposals as well as raise them, so replace rather than merge.
    setDrafts(pending);
    setImportSummary(
      `Imported ${created.length + pending.length + result.unchanged} faction(s) — ` +
        `${created.length} created, ${pending.length} change(s) to review, ` +
        `${result.unchanged} already up to date.`,
    );
  }

  const aside = useMemo(() => {
    if (!isAdmin || isAuthLoading || loading) return null;
    return (
      <AdminHealthAside
        title="Factions"
        description="Shared groups for model definitions. Renames and reparents wait here until you accept them."
        loadFailed={loadFailed}
        failedMessage="The factions could not be loaded."
        totalLabel="Total"
        total={factions.length}
        pendingCount={drafts.length}
        lists={[{ title: "Structure", items: countFactionParents(factions) }]}
      />
    );
  }, [isAdmin, isAuthLoading, loading, loadFailed, factions, drafts.length]);
  useAsideContent(aside);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Faction Definitions</Title>
          <Text c="dimmed">
            Factions group model definitions, and a parent faction nests one group inside another. New factions are
            created straight away, but renaming or reparenting an existing one is staged for review first, because it
            moves everything beneath it.
          </Text>
        </div>
        {isAdmin && (
          <Group>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              Create new
            </Button>
            <DefinitionTransferButtons
              fileNamePrefix="factions"
              onStart={() => setImportSummary(null)}
              onExport={async () => (await exportFactions({ throwOnError: true })).data}
              onImport={async (document) => (await importFactions({ body: document, throwOnError: true })).data}
              onImported={handleImported}
            />
          </Group>
        )}
      </Group>

      {loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          The factions could not be loaded. Reload the page to try again.
        </Alert>
      )}

      {importSummary && (
        <Alert color="blue" icon={<IconCircleCheck size={16} />} withCloseButton onClose={() => setImportSummary(null)}>
          {importSummary}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
        <Stack gap="lg">
          <PendingChangesPanel
            title="Proposed changes"
            description="Nothing here is in effect yet. A faction groups every model definition beneath it, so renaming or reparenting one waits on a decision, whether an import or an admin proposed it."
            usageNoun="model definition"
            rows={pendingRows}
            busyRowId={busyDraftId}
            onAccept={handleAcceptDraft}
            onReject={handleRejectDraft}
            onViewHistory={handleViewHistory}
          />

          <div>
            {factions.length === 0 ? (
              // Silent when the load failed: the alert above already explains the empty list, and
              // "none exist yet" would be stating something the page does not know.
              !loadFailed && <Text c="dimmed">No faction definitions exist yet.</Text>
            ) : (
              <ResponsiveTable minWidth={520}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Dataset Id</Table.Th>
                    <Table.Th>Parent Faction</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {factions.map((faction) => (
                    <Table.Tr key={faction.id}>
                      <Table.Td>{faction.name}</Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">
                          {faction.externalId ?? "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td>{nameOf(faction.parentFactionId)}</Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap" justify="flex-end">
                          <ActionIcon variant="light" onClick={() => setEditing(faction)} title="Propose a change">
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => {
                              if (faction.id) {
                                handleDeleteFaction(faction.id);
                              }
                            }}
                            loading={deletingFactionId === faction.id}
                            title="Delete faction"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </ResponsiveTable>
            )}
          </div>
        </Stack>
      </AdminPageGate>

      <Modal opened={createOpened} onClose={closeCreate} title="Create new faction definition">
        <form onSubmit={handleCreateNew}>
          <Stack>
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
            <TextInput
              label="Dataset Id"
              description="Stable identifier used to match this faction on a later import."
              value={newExternalId}
              onChange={(e) => setNewExternalId(e.currentTarget.value)}
              required
            />
            <Select
              label="Parent Faction"
              placeholder="None"
              data={[{ value: "", label: "None" }, ...factions.map((f) => ({ value: f.id, label: f.name }))]}
              value={newParentFactionId}
              onChange={(updatedParentFactionId) => {
                setNewParentFactionId(updatedParentFactionId !== "" ? updatedParentFactionId : null);
              }}
            />
            <Group justify="flex-end">
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <FactionFormModal
        opened={editing !== null}
        title="Propose a faction change"
        submitLabel="Propose change"
        notice={
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {factionUsageWarning(usageByFactionId.get(editing?.id) ?? 0)}
          </Alert>
        }
        faction={editing}
        factions={factions}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleProposeChange}
      />

      <PublishHistoryModal
        opened={history.target !== null}
        definitionName={history.target?.name ?? null}
        entries={history.entries}
        loading={history.loading}
        failed={history.failed}
        onClose={history.close}
      />
    </Stack>
  );
}
