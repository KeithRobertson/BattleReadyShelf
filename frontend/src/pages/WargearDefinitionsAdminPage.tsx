import { Alert, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconAlertCircle, IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import AdminPageGate from "@/components/admin/AdminPageGate.tsx";
import PendingWargearRenames from "@/components/admin/wargear/PendingWargearRenames.tsx";
import RenameWargearDefinitionModal from "@/components/admin/wargear/RenameWargearDefinitionModal.tsx";
import WargearDefinitionTable from "@/components/admin/wargear/WargearDefinitionTable.tsx";
import type { WargearDefinition, WargearDefinitionDraft } from "@/generated";
import {
  discardWargearDefinitionDraft,
  getWargearDefinitionDrafts,
  getWargearDefinitions,
  publishWargearDefinitionDraft,
  updateWargearDefinition,
} from "@/generated";

function matchesSearch(definition: WargearDefinition, search: string) {
  const term = search.trim().toLowerCase();
  if (term === "") return true;
  return (
    definition.name.toLowerCase().includes(term) || (definition.externalId?.toLowerCase().includes(term) ?? false)
  );
}

/** Names that more than one definition shares - a hint that two rows should probably be one. */
function duplicateNames(definitions: WargearDefinition[]) {
  const counts = new Map<string, number>();
  definitions.forEach((definition) => {
    const key = definition.name.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return definitions
    .filter((definition) => (counts.get(definition.name.toLowerCase()) ?? 0) > 1)
    .map((definition) => definition.name)
    .filter((name, index, all) => all.indexOf(name) === index);
}

export default function WargearDefinitionsAdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [definitions, setDefinitions] = useState<WargearDefinition[]>([]);
  const [drafts, setDrafts] = useState<WargearDefinitionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      Promise.all([getWargearDefinitions({ signal }), getWargearDefinitionDrafts({ signal })])
        .then(([definitionsRes, draftsRes]) => {
          if (signal?.aborted) return;
          setDefinitions(definitionsRes.data ?? []);
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

  const visible = useMemo(
    () => definitions.filter((definition) => matchesSearch(definition, search)),
    [definitions, search],
  );
  const duplicates = useMemo(() => duplicateNames(definitions), [definitions]);
  const unusedCount = useMemo(
    () => definitions.filter((definition) => (definition.usageCount ?? 0) === 0).length,
    [definitions],
  );

  async function handleRename(definition: WargearDefinition, name: string) {
    if (!definition.id) return;
    setError(null);
    setSaving(true);
    try {
      const updated = (await updateWargearDefinition({ path: { wargearDefinitionId: definition.id }, body: { name } }))
        .data;
      if (!updated) throw new Error("Failed to rename wargear definition");
      setDefinitions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      // Renaming by hand settles the question, so the backend drops any pending proposal for it.
      setDrafts((prev) => prev.filter((draft) => draft.wargearDefinitionId !== updated.id));
      setRenaming(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAcceptDraft(draft: WargearDefinitionDraft) {
    if (!draft.id) return;
    setError(null);
    setBusyDraftId(draft.id);
    try {
      const updated = (await publishWargearDefinitionDraft({ path: { draftId: draft.id } })).data;
      if (!updated) throw new Error("Failed to apply the proposed name");
      setDefinitions((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

  async function handleRejectDraft(draft: WargearDefinitionDraft) {
    if (!draft.id) return;
    setError(null);
    setBusyDraftId(draft.id);
    try {
      await discardWargearDefinitionDraft({ path: { draftId: draft.id } });
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusyDraftId(null);
    }
  }

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
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      <AdminPageGate isAuthLoading={isAuthLoading} isAuthorised={isAuthenticated && isAdmin} loading={loading}>
        <Stack gap="md">
          <PendingWargearRenames
            drafts={drafts}
            busyDraftId={busyDraftId}
            onAccept={handleAcceptDraft}
            onReject={handleRejectDraft}
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
            <Text c="dimmed">No wargear definitions match your search.</Text>
          ) : (
            <WargearDefinitionTable definitions={visible} onRename={setRenaming} />
          )}
        </Stack>
      </AdminPageGate>

      <RenameWargearDefinitionModal
        definition={renaming}
        saving={saving}
        onClose={() => setRenaming(null)}
        onSave={handleRename}
      />
    </Stack>
  );
}
