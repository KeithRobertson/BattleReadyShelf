import { ActionIcon, Alert, Badge, Button, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import PendingChangesPanel, { type PendingChangeRow } from "@/components/admin/PendingChangesPanel.tsx";
import PublishHistoryModal from "@/components/admin/PublishHistoryModal.tsx";
import usePublishHistory from "@/components/admin/usePublishHistory.ts";
import PaintFormModal, { type PaintFormValues, paintTypeLabel } from "@/components/mydefinitions/PaintFormModal.tsx";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { Paint, PaintDraft, PaintImportResult } from "@/generated";
import {
  createPaint,
  deletePaint,
  discardPaintDraft,
  exportPaints,
  getAdminPaints,
  getPaintDrafts,
  getPaintPublishHistory,
  importPaints,
  proposePaintChange,
  publishPaintDraft,
} from "@/generated";

function matchesSearch(paint: Paint, search: string) {
  const term = search.trim().toLowerCase();
  if (term === "") return true;
  return (
    paint.name.toLowerCase().includes(term) ||
    (paint.brand?.toLowerCase().includes(term) ?? false) ||
    (paint.externalId?.toLowerCase().includes(term) ?? false)
  );
}

function usageWarning(usageCount: number) {
  if (usageCount === 0) {
    return "No paint recipes use this paint yet.";
  }
  if (usageCount === 1) {
    return "1 paint recipe uses this paint and will show the new details once the change is accepted.";
  }
  return `${usageCount} paint recipes use this paint and will all show the new details once the change is accepted.`;
}

function display(value?: string | null) {
  return value || null;
}

function toPendingRow(draft: PaintDraft): PendingChangeRow {
  const fields = [];
  if (draft.currentName !== draft.proposedName) {
    fields.push({ label: "Name", before: draft.currentName, after: draft.proposedName });
  }
  if ((draft.currentBrand ?? null) !== (draft.proposedBrand ?? null)) {
    fields.push({ label: "Brand", before: display(draft.currentBrand), after: display(draft.proposedBrand) });
  }
  if ((draft.currentPaintType ?? null) !== (draft.proposedPaintType ?? null)) {
    fields.push({
      label: "Type",
      before: paintTypeLabel(draft.currentPaintType),
      after: paintTypeLabel(draft.proposedPaintType),
    });
  }
  if ((draft.currentHexColour ?? null) !== (draft.proposedHexColour ?? null)) {
    fields.push({ label: "Colour", before: display(draft.currentHexColour), after: display(draft.proposedHexColour) });
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

function SourceCell({ externalId }: Readonly<{ externalId?: string | null }>) {
  if (externalId == null) {
    return (
      <Badge color="grape" variant="light">
        Hand-authored
      </Badge>
    );
  }
  return (
    <Text size="sm" ff="monospace">
      {externalId}
    </Text>
  );
}

function UsageCell({ usageCount }: Readonly<{ usageCount: number }>) {
  if (usageCount === 0) {
    return (
      <Text size="sm" c="dimmed">
        Unused
      </Text>
    );
  }
  return <Text size="sm">{usageCount}</Text>;
}

function PaintName({ paint }: Readonly<{ paint: Paint }>) {
  return (
    <Group gap="xs" wrap="nowrap">
      <PaintSwatch hexColour={paint.hexColour} label={paint.name} />
      <Text span>{paint.name}</Text>
    </Group>
  );
}

export default function PaintDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [paints, setPaints] = useState<Paint[]>([]);
  const [drafts, setDrafts] = useState<PaintDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Paint | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [deletingPaintId, setDeletingPaintId] = useState("");

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      Promise.all([getAdminPaints({ signal }), getPaintDrafts({ signal })])
        .then(([paintsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setPaints(paintsRes.data ?? []);
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

  const visible = useMemo(() => paints.filter((paint) => matchesSearch(paint, search)), [paints, search]);
  const pendingRows = useMemo(() => drafts.map(toPendingRow), [drafts]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const usageByPaintId = useMemo(
    () => new Map(drafts.map((draft) => [draft.paintId, draft.usageCount ?? 0])),
    [drafts],
  );
  const history = usePublishHistory(
    useCallback(async (paintId: string) => (await getPaintPublishHistory({ path: { paintId } })).data ?? [], []),
  );

  function handleViewHistory(row: PendingChangeRow) {
    const draft = draftById.get(row.id);
    if (draft?.paintId) history.open(draft.paintId, draft.currentName);
  }

  const unusedCount = useMemo(() => paints.filter((paint) => (paint.usageCount ?? 0) === 0).length, [paints]);

  async function handleCreate(values: PaintFormValues) {
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      const created = (await createPaint({ body: values })).data;
      if (!created) throw new Error("Failed to create paint");
      setPaints((prev) => [...prev, created]);
      setCreating(false);
      setNotice(`Created ${created.name}.`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleProposeChange(values: PaintFormValues) {
    const paint = editing;
    if (!paint?.id) return;
    setError(null);
    setSaving(true);
    try {
      const staged = (await proposePaintChange({ path: { paintId: paint.id }, body: values })).data;
      setDrafts((prev) => {
        const others = prev.filter((draft) => draft.paintId !== paint.id);
        return staged ? [...others, staged] : others;
      });
      setEditing(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptDraft(row: PendingChangeRow) {
    setError(null);
    setBusyDraftId(row.id);
    try {
      const updated = (await publishPaintDraft({ path: { draftId: row.id } })).data;
      if (!updated) throw new Error("Failed to apply the proposed change");
      setPaints((prev) => prev.map((paint) => (paint.id === updated.id ? updated : paint)));
      setDrafts((prev) => prev.filter((draft) => draft.id !== row.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleRejectDraft(row: PendingChangeRow) {
    setError(null);
    setBusyDraftId(row.id);
    try {
      await discardPaintDraft({ path: { draftId: row.id } });
      setDrafts((prev) => prev.filter((draft) => draft.id !== row.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleDeletePaint(paintId: string) {
    setError(null);
    try {
      setDeletingPaintId(paintId);
      await deletePaint({ path: { paintId } });
      setPaints((prev) => prev.filter((paint) => paint.id !== paintId));
      setDrafts((prev) => prev.filter((draft) => draft.paintId !== paintId));
    } catch (e) {
      setError(String(e));
    } finally {
      setDeletingPaintId("");
    }
  }

  function handleImported(result: PaintImportResult) {
    const created = result.created ?? [];
    const pending = result.pendingChanges ?? [];
    setPaints((prev) => [...prev, ...created]);
    // A re-import can clear proposals as well as raise them, so replace rather than merge.
    setDrafts(pending);
    setNotice(
      `Imported ${created.length + pending.length + result.unchanged} paint(s) — ` +
        `${created.length} created, ${pending.length} change(s) to review, ` +
        `${result.unchanged} already up to date.`,
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>Manage Paint Definitions</Title>
          <Text c="dimmed">
            Paints are shared catalogue entries for recipe building. Creating a new paint is immediate, while changes to
            an existing shared paint are staged for review before they affect recipes.
          </Text>
        </div>
        {isAdmin && (
          <Group gap="xs">
            <DefinitionTransferButtons
              fileNamePrefix="paints"
              onStart={() => {
                setError(null);
                setNotice(null);
              }}
              onError={setError}
              onExport={async () => (await exportPaints()).data}
              onImport={async (document) => (await importPaints({ body: document })).data}
              onImported={handleImported}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
              Create new
            </Button>
          </Group>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      {notice && (
        <Alert color="blue" icon={<IconCircleCheck size={16} />} withCloseButton onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
        <Stack gap="md">
          <PendingChangesPanel
            title="Proposed changes"
            description="Nothing here is in effect yet. Shared paints are not changed automatically; accepting a proposal applies its name, brand, type and colour wherever the paint is used."
            usageNoun="recipe"
            rows={pendingRows}
            busyRowId={busyDraftId}
            onAccept={handleAcceptDraft}
            onReject={handleRejectDraft}
            onViewHistory={handleViewHistory}
          />

          <TextInput
            placeholder="Search by name, brand or dataset id"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />

          <Text size="sm" c="dimmed">
            Showing {visible.length} of {paints.length} paints. {unusedCount} are not used by any recipe.
          </Text>

          {visible.length === 0 ? (
            <Text c="dimmed">No paints match your search.</Text>
          ) : (
            <ResponsiveTable highlightOnHover fitOnMobile>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th visibleFrom="sm">Brand</Table.Th>
                  <Table.Th visibleFrom="sm">Type</Table.Th>
                  <Table.Th visibleFrom="sm">Dataset Id</Table.Th>
                  <Table.Th visibleFrom="sm">Used by</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visible.map((paint) => (
                  <Table.Tr key={paint.id}>
                    <Table.Td style={{ wordBreak: "break-word" }}>
                      <PaintName paint={paint} />
                      <Group gap="xs" mt={4} hiddenFrom="sm">
                        <Text size="sm" c="dimmed">
                          {paint.brand ?? "No brand"}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {paintTypeLabel(paint.paintType) ?? "No type"}
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td visibleFrom="sm">{paint.brand ?? <Text c="dimmed">None</Text>}</Table.Td>
                    <Table.Td visibleFrom="sm">
                      {paintTypeLabel(paint.paintType) ?? <Text c="dimmed">None</Text>}
                    </Table.Td>
                    <Table.Td visibleFrom="sm">
                      <SourceCell externalId={paint.externalId} />
                    </Table.Td>
                    <Table.Td visibleFrom="sm">
                      <UsageCell usageCount={paint.usageCount ?? 0} />
                    </Table.Td>
                    <Table.Td w={1} style={{ whiteSpace: "nowrap" }}>
                      <Group gap="xs" wrap="nowrap" justify="flex-end">
                        <ActionIcon variant="light" onClick={() => setEditing(paint)} title="Propose a change">
                          <IconPencil size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => {
                            if (paint.id) handleDeletePaint(paint.id);
                          }}
                          loading={deletingPaintId === paint.id}
                          title="Delete paint"
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
        </Stack>
      </AdminPageGate>

      <PaintFormModal
        opened={creating}
        title="Create new paint definition"
        submitLabel="Create"
        paint={null}
        saving={saving}
        onClose={() => setCreating(false)}
        onSave={handleCreate}
      />

      <PaintFormModal
        opened={editing !== null}
        title="Propose a paint change"
        submitLabel="Propose change"
        notice={
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {usageWarning(usageByPaintId.get(editing?.id) ?? editing?.usageCount ?? 0)}
          </Alert>
        }
        paint={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={handleProposeChange}
      />

      <PublishHistoryModal
        opened={history.target !== null}
        definitionName={history.target?.name ?? null}
        entries={history.entries}
        loading={history.loading}
        onClose={history.close}
      />
    </Stack>
  );
}
