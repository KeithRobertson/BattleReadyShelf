import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSelector,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import { AdminHealthAside } from "@/components/admin/aside/AdminHealthAside.tsx";
import { DefinitionTransferButtons } from "@/components/admin/DefinitionTransferButtons.tsx";
import PendingChangesPanel, { type PendingChangeRow } from "@/components/admin/PendingChangesPanel.tsx";
import PublishHistoryModal from "@/components/admin/PublishHistoryModal.tsx";
import usePublishHistory from "@/components/admin/usePublishHistory.ts";
import PaintFormModal, {
  PAINT_TYPE_OPTIONS,
  type PaintFormValues,
  paintTypeLabel,
} from "@/components/mydefinitions/PaintFormModal.tsx";
import PaintSwatch from "@/components/paints/PaintSwatch.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { Paint, PaintDraft, PaintImportResult, PaintType } from "@/generated";
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
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { unusedCount as countUnused, paintBrandCounts, paintTypeCounts } from "@/utils/admin/catalogueStats";

const NONE_FILTER = "__none__";

type PaintSortField = "name" | "brand" | "type" | "externalId" | "usageCount";
type PaintSortDirection = "asc" | "desc";

function matchesSearch(paint: Paint, search: string) {
  const term = search.trim().toLowerCase();
  if (term === "") return true;
  return (
    paint.name.toLowerCase().includes(term) ||
    (paint.brand?.toLowerCase().includes(term) ?? false) ||
    (paint.externalId?.toLowerCase().includes(term) ?? false)
  );
}

function matchesBrandFilter(paint: Paint, brandFilter: string[]) {
  if (brandFilter.length === 0) return true;
  const value = paint.brand?.trim() ? paint.brand : NONE_FILTER;
  return brandFilter.includes(value);
}

function matchesTypeFilter(paint: Paint, typeFilter: string[]) {
  if (typeFilter.length === 0) return true;
  const value = paint.paintType ?? NONE_FILTER;
  return typeFilter.includes(value);
}

function isBlank(value?: string | null) {
  return !value?.trim();
}

function compareOptionalText(a?: string | null, b?: string | null) {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function paintTextForSort(paint: Paint, field: Exclude<PaintSortField, "usageCount">) {
  switch (field) {
    case "name":
      return paint.name;
    case "brand":
      return paint.brand;
    case "type":
      return paintTypeLabel(paint.paintType);
    case "externalId":
      return paint.externalId;
  }
}

function comparePaints(a: Paint, b: Paint, field: PaintSortField, direction: PaintSortDirection) {
  const dir = direction === "asc" ? 1 : -1;
  if (field === "usageCount") {
    return dir * ((a.usageCount ?? 0) - (b.usageCount ?? 0));
  }

  const left = paintTextForSort(a, field);
  const right = paintTextForSort(b, field);
  if (field !== "name" && isBlank(left) !== isBlank(right)) {
    return isBlank(left) ? 1 : -1;
  }
  return dir * compareOptionalText(left, right);
}

function sortHeaderIcon(active: boolean, sortDirection: PaintSortDirection) {
  if (!active) return IconSelector;
  if (sortDirection === "asc") return IconChevronUp;
  return IconChevronDown;
}

function sortAria(active: boolean, sortDirection: PaintSortDirection) {
  if (!active) return "none";
  if (sortDirection === "asc") return "ascending";
  return "descending";
}

function brandFilterOptions(paints: Paint[]): { value: string; label: string }[] {
  const brands = [
    ...new Set(paints.map((paint) => paint.brand?.trim()).filter((brand): brand is string => Boolean(brand))),
  ].toSorted((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  const options = brands.map((brand) => ({ value: brand, label: brand }));
  if (paints.some((paint) => !paint.brand?.trim())) {
    options.push({ value: NONE_FILTER, label: "No brand" });
  }
  return options;
}

function typeFilterOptions(paints: Paint[]): { value: string; label: string }[] {
  const present = new Set(paints.map((paint) => paint.paintType).filter((type): type is PaintType => Boolean(type)));
  const options: { value: string; label: string }[] = PAINT_TYPE_OPTIONS.filter((option) =>
    present.has(option.value),
  ).map((option) => ({
    value: option.value,
    label: option.label,
  }));
  if (paints.some((paint) => !paint.paintType)) {
    options.push({ value: NONE_FILTER, label: "No type" });
  }
  return options;
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  visibleFrom,
}: Readonly<{
  label: string;
  field: PaintSortField;
  sortField: PaintSortField;
  sortDirection: PaintSortDirection;
  onSort: (field: PaintSortField) => void;
  visibleFrom?: "sm";
}>) {
  const active = sortField === field;
  const Icon = sortHeaderIcon(active, sortDirection);

  return (
    <Table.Th visibleFrom={visibleFrom} aria-sort={sortAria(active, sortDirection)}>
      <UnstyledButton onClick={() => onSort(field)} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Text span size="sm" fw={700}>
          {label}
        </Text>
        <Icon size={14} aria-hidden />
      </UnstyledButton>
    </Table.Th>
  );
}

function PaintCatalogueFilters({
  search,
  setSearch,
  brandFilter,
  setBrandFilter,
  brandOptions,
  typeFilter,
  setTypeFilter,
  typeOptions,
}: Readonly<{
  search: string;
  setSearch: (value: string) => void;
  brandFilter: string[];
  setBrandFilter: (value: string[]) => void;
  brandOptions: { value: string; label: string }[];
  typeFilter: string[];
  setTypeFilter: (value: string[]) => void;
  typeOptions: { value: string; label: string }[];
}>) {
  return (
    <Group align="flex-end" wrap="wrap" gap="sm">
      <TextInput
        placeholder="Search by name, brand or dataset id"
        label="Search"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        style={{ flex: "1 1 220px" }}
      />
      {brandOptions.length > 0 && (
        <MultiSelect
          label="Brand"
          placeholder={brandFilter.length === 0 ? "All" : undefined}
          data={brandOptions}
          value={brandFilter}
          onChange={setBrandFilter}
          searchable
          clearable
          w={220}
        />
      )}
      {typeOptions.length > 0 && (
        <MultiSelect
          label="Type"
          placeholder={typeFilter.length === 0 ? "All" : undefined}
          data={typeOptions}
          value={typeFilter}
          onChange={setTypeFilter}
          searchable
          clearable
          w={220}
        />
      )}
    </Group>
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<PaintSortField>("name");
  const [sortDirection, setSortDirection] = useState<PaintSortDirection>("asc");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Paint | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [deletingPaintId, setDeletingPaintId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Paint | null>(null);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadFailed(false);
      Promise.all([getAdminPaints({ signal, throwOnError: true }), getPaintDrafts({ signal, throwOnError: true })])
        .then(([paintsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setPaints(paintsRes.data ?? []);
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

  const brandOptions = useMemo(() => brandFilterOptions(paints), [paints]);
  const typeOptions = useMemo(() => typeFilterOptions(paints), [paints]);

  const visible = useMemo(() => {
    const filtered = paints.filter(
      (paint) =>
        matchesSearch(paint, search) && matchesBrandFilter(paint, brandFilter) && matchesTypeFilter(paint, typeFilter),
    );
    return [...filtered].sort((a, b) => comparePaints(a, b, sortField, sortDirection));
  }, [paints, search, brandFilter, typeFilter, sortField, sortDirection]);

  function handleSort(field: PaintSortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection("asc");
  }
  const pendingRows = useMemo(() => drafts.map(toPendingRow), [drafts]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const usageByPaintId = useMemo(
    () => new Map(drafts.map((draft) => [draft.paintId, draft.usageCount ?? 0])),
    [drafts],
  );
  const history = usePublishHistory(
    useCallback(
      async (paintId: string) => (await getPaintPublishHistory({ path: { paintId }, throwOnError: true })).data ?? [],
      [],
    ),
  );

  function handleViewHistory(row: PendingChangeRow) {
    const draft = draftById.get(row.id);
    if (draft?.paintId) history.open(draft.paintId, draft.currentName);
  }

  const unusedCount = useMemo(() => countUnused(paints), [paints]);
  const brandCounts = useMemo(() => paintBrandCounts(paints), [paints]);
  const typeCounts = useMemo(() => paintTypeCounts(paints), [paints]);

  async function handleCreate(values: PaintFormValues) {
    setNotice(null);
    setSaving(true);
    try {
      const created = (await createPaint({ body: values, throwOnError: true })).data;
      if (!created) return;
      setPaints((prev) => [...prev, created]);
      setCreating(false);
      setNotice(`Created ${created.name}.`);
    } catch {
      // Reported as a notification by the API layer; the form stays open with the values intact.
    } finally {
      setSaving(false);
    }
  }

  async function handleProposeChange(values: PaintFormValues) {
    const paint = editing;
    if (!paint?.id) return;
    setSaving(true);
    try {
      const staged = (await proposePaintChange({ path: { paintId: paint.id }, body: values, throwOnError: true })).data;
      setDrafts((prev) => {
        const others = prev.filter((draft) => draft.paintId !== paint.id);
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
      const updated = (await publishPaintDraft({ path: { draftId: row.id }, throwOnError: true })).data;
      if (!updated) return;
      setPaints((prev) => prev.map((paint) => (paint.id === updated.id ? updated : paint)));
      setDrafts((prev) => prev.filter((draft) => draft.id !== row.id));
    } catch {
      // Reported as a notification by the API layer; the proposal stays pending.
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleRejectDraft(row: PendingChangeRow) {
    setBusyDraftId(row.id);
    try {
      await discardPaintDraft({ path: { draftId: row.id }, throwOnError: true });
      setDrafts((prev) => prev.filter((draft) => draft.id !== row.id));
    } catch {
      // Reported as a notification by the API layer; the proposal stays pending.
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleDeletePaint() {
    const paint = pendingDelete;
    if (!paint?.id) return;
    setNotice(null);
    try {
      setDeletingPaintId(paint.id);
      // throwOnError, or a refused delete resolves as a success and the paint vanishes from the page
      // while staying in the catalogue until the next reload.
      await deletePaint({ path: { paintId: paint.id }, throwOnError: true });
      setPaints((prev) => prev.filter((row) => row.id !== paint.id));
      setDrafts((prev) => prev.filter((draft) => draft.paintId !== paint.id));
    } catch {
      // Reported as a notification by the API layer; the paint stays in the list.
    } finally {
      setPendingDelete(null);
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

  const aside = useMemo(() => {
    if (!isAdmin || isAuthLoading || loading) return null;
    return (
      <AdminHealthAside
        title="Paints"
        description="Shared catalogue entries for recipe building. Changes wait here until you accept them."
        loadFailed={loadFailed}
        failedMessage="The paint catalogue could not be loaded."
        totalLabel="Total"
        total={paints.length}
        pendingCount={drafts.length}
        lists={[
          {
            title: "Usage",
            items: [{ key: "unused", label: "Unused by recipes", count: unusedCount }],
          },
          { title: "By brand", items: brandCounts, hideEmpty: true },
          { title: "By type", items: typeCounts, hideEmpty: true },
        ]}
      />
    );
  }, [isAdmin, isAuthLoading, loading, loadFailed, paints.length, drafts.length, unusedCount, brandCounts, typeCounts]);
  useAsideContent(aside);

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
              onStart={() => setNotice(null)}
              onExport={async () => (await exportPaints({ throwOnError: true })).data}
              onImport={async (document) => (await importPaints({ body: document, throwOnError: true })).data}
              onImported={handleImported}
            />
            <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
              Create new
            </Button>
          </Group>
        )}
      </Group>

      {loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          The paint catalogue could not be loaded. Reload the page to try again.
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

          <PaintCatalogueFilters
            search={search}
            setSearch={setSearch}
            brandFilter={brandFilter}
            setBrandFilter={setBrandFilter}
            brandOptions={brandOptions}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            typeOptions={typeOptions}
          />

          <Text size="sm" c="dimmed">
            Showing {visible.length} of {paints.length} paints. {unusedCount} are not used by any recipe.
          </Text>

          {visible.length === 0 ? (
            // Silent when the load failed: the alert above already explains the empty list, and
            // blaming the filters would be misleading.
            !loadFailed && <Text c="dimmed">No paints match your filters.</Text>
          ) : (
            <ResponsiveTable highlightOnHover fitOnMobile>
              <Table.Thead>
                <Table.Tr>
                  <SortableHeader
                    label="Name"
                    field="name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Brand"
                    field="brand"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    visibleFrom="sm"
                  />
                  <SortableHeader
                    label="Type"
                    field="type"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    visibleFrom="sm"
                  />
                  <SortableHeader
                    label="Dataset Id"
                    field="externalId"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    visibleFrom="sm"
                  />
                  <SortableHeader
                    label="Used by"
                    field="usageCount"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    visibleFrom="sm"
                  />
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
                          onClick={() => setPendingDelete(paint)}
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

      <Modal
        opened={pendingDelete !== null}
        onClose={() => {
          if (!deletingPaintId) setPendingDelete(null);
        }}
        title="Delete paint from the catalogue?"
      >
        <Stack gap="md">
          <Text size="sm">
            This will remove{" "}
            <Text span fw={600}>
              {pendingDelete?.name}
            </Text>
            {pendingDelete?.brand ? ` (${pendingDelete.brand})` : ""} from the shared catalogue. This cannot be undone.
          </Text>
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            Anyone who customised this paint will keep their copy as a paint they created themselves. It will no longer
            be linked to the catalogue, and they will not be able to revert to the shared version.
          </Alert>
          {(pendingDelete?.usageCount ?? 0) > 0 && (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              {(pendingDelete?.usageCount ?? 0) === 1
                ? "1 paint recipe still uses this paint. That user will get a personal copy, and the recipe will keep using it."
                : `${pendingDelete?.usageCount} paint recipes still use this paint. Each user who used it will get a personal copy, and their recipes will keep using that copy.`}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setPendingDelete(null)} disabled={Boolean(deletingPaintId)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeletePaint} loading={Boolean(deletingPaintId)}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

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
        failed={history.failed}
        onClose={history.close}
      />
    </Stack>
  );
}
