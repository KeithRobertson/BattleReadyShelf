import { Alert, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconAlertTriangle, IconCircleCheck, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { AdminHealthAside } from "@/components/admin/aside/AdminHealthAside.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import PendingChangesPanel, { type PendingChangeRow } from "@/components/admin/PendingChangesPanel.tsx";
import PublishHistoryModal from "@/components/admin/PublishHistoryModal.tsx";
import usePublishHistory from "@/components/admin/usePublishHistory.ts";
import WargearDefinitionTable from "@/components/admin/wargear/WargearDefinitionTable.tsx";
import WargearNameModal from "@/components/definitions/WargearNameModal.tsx";
import type { WargearDefinition, WargearDefinitionDraft, WargearImportResult } from "@/generated";
import {
  discardWargearDefinitionDraft,
  exportWargearDefinitions,
  getWargearDefinitionDrafts,
  getWargearDefinitions,
  getWargearPublishHistory,
  importWargearDefinitions,
  publishWargearDefinitionDraft,
  updateWargearDefinition,
} from "@/generated";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { unusedCount as countUnused, duplicateNames } from "@/utils/admin/catalogueStats";

function matchesSearch(definition: WargearDefinition, search: string) {
  const term = search.trim().toLowerCase();
  if (term === "") return true;
  return definition.name.toLowerCase().includes(term) || (definition.externalId?.toLowerCase().includes(term) ?? false);
}

/** How many model definitions a rename will change the reading of. */
function renameWarning(usageCount: number) {
  if (usageCount === 0) {
    return "No model definitions use this wargear yet.";
  }
  if (usageCount === 1) {
    return "1 model definition uses this wargear and will show the new name once the change is accepted.";
  }
  return `${usageCount} model definitions use this wargear and will all show the new name once the change is accepted.`;
}

/** A pending rename shown as the single field it changes. */
function toPendingRow(draft: WargearDefinitionDraft): PendingChangeRow {
  return {
    id: draft.id ?? "",
    currentName: draft.currentName,
    externalId: draft.externalId,
    origin: draft.origin,
    usageCount: draft.usageCount,
    fields: [{ label: "Name", before: draft.currentName, after: draft.proposedName }],
  };
}

export default function WargearDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [definitions, setDefinitions] = useState<WargearDefinition[]>([]);
  const [drafts, setDrafts] = useState<WargearDefinitionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [renaming, setRenaming] = useState<WargearDefinition | null>(null);
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
      Promise.all([
        getWargearDefinitions({ signal, throwOnError: true }),
        getWargearDefinitionDrafts({ signal, throwOnError: true }),
      ])
        .then(([definitionsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setDefinitions(definitionsRes.data ?? []);
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

  const visible = useMemo(
    () => definitions.filter((definition) => matchesSearch(definition, search)),
    [definitions, search],
  );
  const duplicates = useMemo(() => duplicateNames(definitions), [definitions]);
  const pendingRows = useMemo(() => drafts.map(toPendingRow), [drafts]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const history = usePublishHistory(
    useCallback(
      async (definitionId: string) =>
        (await getWargearPublishHistory({ path: { wargearDefinitionId: definitionId }, throwOnError: true })).data ??
        [],
      [],
    ),
  );

  function handleViewHistory(row: PendingChangeRow) {
    const draft = draftById.get(row.id);
    if (draft?.wargearDefinitionId) history.open(draft.wargearDefinitionId, draft.currentName);
  }

  const unusedCount = useMemo(() => countUnused(definitions), [definitions]);

  async function handleRename(name: string) {
    const definition = renaming;
    if (!definition?.id) return;
    setSaving(true);
    try {
      const staged = (
        await updateWargearDefinition({
          path: { wargearDefinitionId: definition.id },
          body: { name },
          throwOnError: true,
        })
      ).data;
      // A hand rename is staged like an imported one, so the published list is untouched until it
      // is accepted. No body back means the name already matched, which clears any stale proposal.
      setDrafts((prev) => {
        const others = prev.filter((draft) => draft.wargearDefinitionId !== definition.id);
        return staged ? [...others, staged] : others;
      });
      setRenaming(null);
    } catch {
      // Reported as a notification by the API layer; the modal stays open on the proposed name.
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptDraft(row: PendingChangeRow) {
    setBusyDraftId(row.id);
    try {
      const updated = (await publishWargearDefinitionDraft({ path: { draftId: row.id }, throwOnError: true })).data;
      if (!updated) return;
      setDefinitions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
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
      await discardWargearDefinitionDraft({ path: { draftId: row.id }, throwOnError: true });
      setDrafts((prev) => prev.filter((d) => d.id !== row.id));
    } catch {
      // Reported as a notification by the API layer; the proposal stays pending.
    } finally {
      setBusyDraftId(null);
    }
  }

  function handleImported(result: WargearImportResult) {
    const created = result.created ?? [];
    const pending = result.pendingChanges ?? [];
    setDefinitions((prev) => [...prev, ...created]);
    // A re-import can clear proposals as well as raise them, so replace rather than merge.
    setDrafts(pending);
    setImportSummary(
      `Imported ${created.length + pending.length + result.unchanged} wargear definition(s) — ` +
        `${created.length} created, ${pending.length} name change(s) to review, ` +
        `${result.unchanged} already up to date.`,
    );
  }

  const aside = useMemo(() => {
    if (!isAdmin || isAuthLoading || loading) return null;
    return (
      <AdminHealthAside
        title="Wargear"
        description="Shared names referenced by model definitions. Renames wait here until you accept them."
        loadFailed={loadFailed}
        failedMessage="The wargear definitions could not be loaded."
        totalLabel="Total"
        total={definitions.length}
        pendingCount={drafts.length}
        lists={[
          {
            title: "Usage",
            items: [
              { key: "unused", label: "Unused", count: unusedCount },
              { key: "duplicates", label: "Duplicate names", count: duplicates.length },
            ],
          },
        ]}
      />
    );
  }, [isAdmin, isAuthLoading, loading, loadFailed, definitions.length, drafts.length, unusedCount, duplicates.length]);
  useAsideContent(aside);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Wargear Definitions</Title>
          <Text c="dimmed">
            Wargear is shared: each entry here is named once and referenced by every model definition that uses it, so
            renaming one updates them all. Which slot it goes in, and whether it is the default, stay on the model
            definition.
          </Text>
        </div>
        {isAdmin && (
          <DefinitionTransferButtons
            fileNamePrefix="wargear-definitions"
            onStart={() => setImportSummary(null)}
            onExport={async () => (await exportWargearDefinitions({ throwOnError: true })).data}
            onImport={async (document) => (await importWargearDefinitions({ body: document, throwOnError: true })).data}
            onImported={handleImported}
          />
        )}
      </Group>

      {loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          The wargear definitions could not be loaded. Reload the page to try again.
        </Alert>
      )}

      {importSummary && (
        <Alert color="blue" icon={<IconCircleCheck size={16} />} withCloseButton onClose={() => setImportSummary(null)}>
          {importSummary}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
        <Stack gap="md">
          <PendingChangesPanel
            title="Proposed renames"
            description="Nothing here is in effect yet. Shared wargear is never renamed automatically, whether an import or an admin proposed it — accepting one applies the new name everywhere it is used."
            usageNoun="model"
            rows={pendingRows}
            busyRowId={busyDraftId}
            onAccept={handleAcceptDraft}
            onReject={handleRejectDraft}
            onViewHistory={handleViewHistory}
          />

          {duplicates.length > 0 && (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              More than one wargear definition shares a name: {duplicates.join(", ")}. That is allowed, but if they are
              meant to be the same thing they should be a single entry.
            </Alert>
          )}

          <TextInput
            placeholder="Search by name or dataset id"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />

          <Text size="sm" c="dimmed">
            Showing {visible.length} of {definitions.length} wargear definitions. {unusedCount} are not used by any
            model definition.
          </Text>

          {visible.length === 0 ? (
            // Silent when the load failed: the alert above already explains the empty list, and
            // blaming the search would be misleading.
            !loadFailed && <Text c="dimmed">No wargear definitions match your search.</Text>
          ) : (
            <WargearDefinitionTable definitions={visible} onRename={setRenaming} />
          )}
        </Stack>
      </AdminPageGate>

      <WargearNameModal
        opened={renaming !== null}
        title="Propose a wargear rename"
        submitLabel="Propose change"
        notice={
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {renameWarning(renaming?.usageCount ?? 0)}
          </Alert>
        }
        definition={renaming}
        saving={saving}
        onClose={() => setRenaming(null)}
        onSave={handleRename}
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
