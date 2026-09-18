import {
  ActionIcon,
  Alert,
  Badge,
  Button,
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
import { IconAlertCircle, IconArrowBackUp, IconGitCompare, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import DefinitionDiffModal, { PERSONAL_DIFF_LABELS } from "@/components/definitions/DefinitionDiffModal.tsx";
import CatalogueMineBody from "@/components/mydefinitions/CatalogueMineBody.tsx";
import CatalogueVisibilityFilter from "@/components/mydefinitions/CatalogueVisibilityFilter.tsx";
import {
  bulkHiddenIntent,
  type CatalogueVisibility,
  isHidden,
  markHidden,
  matchesSearch,
  matchesVisibility,
} from "@/components/mydefinitions/catalogueVisibility";
import HideDefinitionButton, { HiddenBadge } from "@/components/mydefinitions/HideDefinitionButton.tsx";
import { PersonalCatalogueAside } from "@/components/mydefinitions/PersonalCatalogueAside.tsx";
import PersonalModelDefinitionEditor from "@/components/mydefinitions/PersonalModelDefinitionEditor.tsx";
import { countMineOrigins, countPickerVisibility } from "@/components/mydefinitions/personalCatalogueStats";
import PageGate from "@/components/PageGate.tsx";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import type { Faction, ModelDefinition, WargearDefinition } from "@/generated";
import {
  createMyModelDefinition,
  customiseModelDefinition,
  deleteMyModelDefinition,
  getAvailableWargearDefinitions,
  getMyFactions,
  getMyModelDefinitions,
  getSharedFactions,
  getSharedModelDefinitions,
  setDefinitionsHidden,
} from "@/generated";
import { useAsideContent } from "@/hooks/useAsideContent.ts";
import { MODEL_DEFINITIONS_KEY } from "@/queryKeys.ts";
import { type DraftDiff, diffPersonalModelDefinition } from "@/utils/modelDefinitionDraftDiff";

function factionLabel(definition: ModelDefinition, factionsById: Map<string, Faction>): string {
  if (!definition.factionId) return "Uncategorised";
  return factionsById.get(definition.factionId)?.name ?? "Uncategorised";
}

/** Says at a glance whether this is a tweak to a shared model or something the user invented. */
function OriginBadge({ definition }: Readonly<{ definition: ModelDefinition }>) {
  if (definition.baseModelDefinitionId) {
    return (
      <Badge variant="light" color="blue">
        Customised
      </Badge>
    );
  }
  return (
    <Badge variant="light" color="grape">
      Your own
    </Badge>
  );
}

function ChangeCountBadge({ diff }: Readonly<{ diff: DraftDiff | undefined }>) {
  if (!diff || diff.isNew) return null;
  if (diff.changeCount === 0) {
    return (
      <Badge variant="light" color="gray">
        No changes
      </Badge>
    );
  }
  return <Badge variant="light">{diff.changeCount === 1 ? "1 change" : `${diff.changeCount} changes`}</Badge>;
}

/** Why this row cannot be shown again from here: hiding its faction already took it out. */
function hideDisabledReason(definition: ModelDefinition, factionsById: Map<string, Faction>): string | undefined {
  const faction = definition.factionId ? factionsById.get(definition.factionId) : undefined;
  if (!faction?.hidden) return undefined;
  return `Hidden because you hid ${faction.name}. Show that faction again from My Factions.`;
}

type MineTableProps = Readonly<{
  definitions: ModelDefinition[];
  diffsById: Map<string, DraftDiff>;
  factionsById: Map<string, Faction>;
  removingIds: Set<string>;
  hidingIds: Set<string>;
  onEdit: (definition: ModelDefinition) => void;
  onDiff: (definition: ModelDefinition) => void;
  onRemove: (definition: ModelDefinition) => void;
  onSetHidden: (ids: readonly string[], hidden: boolean) => void;
}>;

function MyDefinitionsTable({
  definitions,
  diffsById,
  factionsById,
  removingIds,
  hidingIds,
  onEdit,
  onDiff,
  onRemove,
  onSetHidden,
}: MineTableProps) {
  return (
    <ResponsiveTable striped withTableBorder verticalSpacing="xs" fitOnMobile>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th visibleFrom="sm">Faction</Table.Th>
          <Table.Th visibleFrom="sm">Origin</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {definitions.map((definition) => {
          const id = definition.id ?? "";
          const isCustomisation = definition.baseModelDefinitionId != null;
          const factionHideReason = hideDisabledReason(definition, factionsById);
          return (
            <Table.Tr key={id}>
              <Table.Td style={{ wordBreak: "break-word" }}>
                <Group gap="xs" wrap="nowrap">
                  <Text span>{definition.name}</Text>
                  {isHidden(definition) && <HiddenBadge />}
                </Group>
                {/* The columns dropped on a phone reappear here, so narrowing the table never
                    costs information - it only stops the row's buttons scrolling out of reach. */}
                <Group gap="xs" mt={4} hiddenFrom="sm">
                  <OriginBadge definition={definition} />
                  <ChangeCountBadge diff={diffsById.get(id)} />
                  <Text size="sm" c="dimmed">
                    {factionLabel(definition, factionsById)}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td visibleFrom="sm">
                <Text size="sm" c="dimmed">
                  {factionLabel(definition, factionsById)}
                </Text>
              </Table.Td>
              <Table.Td visibleFrom="sm">
                <Group gap="xs">
                  <OriginBadge definition={definition} />
                  <ChangeCountBadge diff={diffsById.get(id)} />
                </Group>
              </Table.Td>
              <Table.Td w={1} style={{ whiteSpace: "nowrap" }}>
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  <Tooltip label="Compare with the shared version">
                    <ActionIcon variant="subtle" aria-label="Compare with shared" onClick={() => onDiff(definition)}>
                      <IconGitCompare size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <HideDefinitionButton
                    hidden={isHidden(definition)}
                    loading={hidingIds.has(id)}
                    disabled={factionHideReason != null}
                    disabledReason={factionHideReason}
                    onToggle={(hidden) => onSetHidden([id], hidden)}
                  />
                  <Tooltip label="Edit">
                    <ActionIcon variant="light" aria-label="Edit" onClick={() => onEdit(definition)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={isCustomisation ? "Revert to the shared version" : "Delete"}>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      aria-label={isCustomisation ? "Revert to shared" : "Delete"}
                      loading={removingIds.has(id)}
                      onClick={() => onRemove(definition)}
                    >
                      {isCustomisation ? <IconArrowBackUp size={16} /> : <IconTrash size={16} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </ResponsiveTable>
  );
}

type SharedTableProps = Readonly<{
  definitions: ModelDefinition[];
  factionsById: Map<string, Faction>;
  customisingIds: Set<string>;
  hidingIds: Set<string>;
  emptyMessage: string;
  onCustomise: (definition: ModelDefinition) => void;
  onSetHidden: (ids: readonly string[], hidden: boolean) => void;
}>;

function SharedCatalogueTable({
  definitions,
  factionsById,
  customisingIds,
  hidingIds,
  emptyMessage,
  onCustomise,
  onSetHidden,
}: SharedTableProps) {
  if (definitions.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {emptyMessage}
      </Text>
    );
  }
  return (
    <ResponsiveTable striped withTableBorder verticalSpacing="xs" fitOnMobile>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th visibleFrom="sm">Faction</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {definitions.map((definition) => {
          const id = definition.id ?? "";
          const factionHideReason = hideDisabledReason(definition, factionsById);
          return (
            <Table.Tr key={id}>
              <Table.Td style={{ wordBreak: "break-word" }}>
                <Group gap="xs" wrap="nowrap">
                  <Text span>{definition.name}</Text>
                  {isHidden(definition) && <HiddenBadge />}
                </Group>
                <Text size="sm" c="dimmed" hiddenFrom="sm">
                  {factionLabel(definition, factionsById)}
                </Text>
              </Table.Td>
              <Table.Td visibleFrom="sm">
                <Text size="sm" c="dimmed">
                  {factionLabel(definition, factionsById)}
                </Text>
              </Table.Td>
              <Table.Td w={1} style={{ whiteSpace: "nowrap" }}>
                <Group justify="flex-end" wrap="nowrap" gap="xs">
                  <HideDefinitionButton
                    hidden={isHidden(definition)}
                    loading={hidingIds.has(id)}
                    disabled={factionHideReason != null}
                    disabledReason={factionHideReason}
                    onToggle={(hidden) => onSetHidden([id], hidden)}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    loading={customisingIds.has(id)}
                    onClick={() => onCustomise(definition)}
                  >
                    Customise
                  </Button>
                </Group>
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </ResponsiveTable>
  );
}

export default function MyModelDefinitionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mine, setMine] = useState<ModelDefinition[]>([]);
  const [shared, setShared] = useState<ModelDefinition[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [wargearDefinitions, setWargearDefinitions] = useState<WargearDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState<ModelDefinition | null>(null);
  const [diffTarget, setDiffTarget] = useState<ModelDefinition | null>(null);
  const [customisingIds, setCustomisingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [hidingIds, setHidingIds] = useState<Set<string>>(new Set());
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState<CatalogueVisibility>("all");
  const queryClient = useQueryClient();

  // Collection pages cache the catalogue, so a definition added or removed here would keep showing
  // the stale version there until that page is next mounted. Dropping the cached copy outright
  // (rather than invalidating it) makes the change visible immediately.
  const invalidateCatalogue = useCallback(() => {
    queryClient.removeQueries({ queryKey: [MODEL_DEFINITIONS_KEY] });
  }, [queryClient]);

  const loadAll = useCallback(
    (signal?: AbortSignal) => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadFailed(false);
      Promise.all([
        getMyModelDefinitions({ signal, throwOnError: true }),
        getSharedModelDefinitions({ signal, throwOnError: true }),
        getMyFactions({ signal, throwOnError: true }),
        getSharedFactions({ signal, throwOnError: true }),
        getAvailableWargearDefinitions({ signal, throwOnError: true }),
      ])
        .then(([mineRes, sharedRes, myFactionsRes, sharedFactionsRes, wargearRes]) => {
          if (signal?.aborted) return;
          setMine(mineRes.data ?? []);
          setShared(sharedRes.data ?? []);
          // Personal lists keep hidden factions so a model under one can still name it, and so the
          // page can explain that it is hidden because of the faction rather than on its own.
          setFactions([...(myFactionsRes.data ?? []), ...(sharedFactionsRes.data ?? [])]);
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
    [isAuthenticated],
  );

  async function handleSetHidden(ids: readonly string[], hidden: boolean) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;

    setHidingIds((current) => {
      const next = new Set(current);
      for (const id of unique) next.add(id);
      return next;
    });
    try {
      await setDefinitionsHidden({
        body: { definitionType: "MODEL_DEFINITION", definitionIds: unique, hidden },
        throwOnError: true,
      });
      const idSet = new Set(unique);
      setMine((current) => markHidden(current, idSet, hidden));
      setShared((current) => markHidden(current, idSet, hidden));
      invalidateCatalogue();
    } catch {
      // Reported as a notification by the API layer; the rows stay as they were.
    } finally {
      setHidingIds((current) => {
        const next = new Set(current);
        for (const id of unique) next.delete(id);
        return next;
      });
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    loadAll(ac.signal);
    return () => ac.abort();
  }, [loadAll]);

  function upsertMine(definition: ModelDefinition) {
    setMine((current) =>
      current.some((d) => d.id === definition.id)
        ? current.map((d) => (d.id === definition.id ? definition : d))
        : [...current, definition],
    );
    invalidateCatalogue();
  }

  function withBusy(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, busy: boolean) {
    setter((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handleCustomise(definition: ModelDefinition) {
    const id = definition.id ?? "";
    withBusy(setCustomisingIds, id, true);
    try {
      const created = (await customiseModelDefinition({ path: { modelDefinitionId: id }, throwOnError: true })).data;
      if (!created) return;
      upsertMine(created);
      setEditing(created);
    } catch {
      // Reported as a notification by the API layer; the shared definition stays uncustomised.
    } finally {
      withBusy(setCustomisingIds, id, false);
    }
  }

  async function handleRemove(definition: ModelDefinition) {
    const id = definition.id ?? "";
    withBusy(setRemovingIds, id, true);
    try {
      // throwOnError, or a refused delete resolves as a success and the definition vanishes from the
      // page while staying on the account until the next reload.
      await deleteMyModelDefinition({ path: { modelDefinitionId: id }, throwOnError: true });
      setMine((current) => current.filter((d) => d.id !== id));
      invalidateCatalogue();
    } catch {
      // Reported as a notification by the API layer; the definition stays in the list.
    } finally {
      withBusy(setRemovingIds, id, false);
    }
  }

  async function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    try {
      const created = (
        await createMyModelDefinition({
          body: { name: newName, attachmentSlots: [], wargearOptions: [] },
          throwOnError: true,
        })
      ).data;
      if (!created) return;
      upsertMine(created);
      setNewName("");
      closeCreate();
      setEditing(created);
    } catch {
      // Reported as a notification by the API layer. The form keeps the name that was typed, so the
      // create can be retried without entering it again.
    }
  }

  const factionsById = useMemo(() => new Map(factions.map((faction) => [faction.id ?? "", faction])), [factions]);
  const sharedById = useMemo(() => new Map(shared.map((definition) => [definition.id ?? "", definition])), [shared]);
  const diffsById = useMemo(
    () =>
      new Map(
        mine.map((definition) => [
          definition.id ?? "",
          diffPersonalModelDefinition(
            definition,
            definition.baseModelDefinitionId ? sharedById.get(definition.baseModelDefinitionId) : undefined,
            factionsById,
          ),
        ]),
      ),
    [mine, sharedById, factionsById],
  );

  // A shared definition the user has already customised is omitted here, because their version is
  // what they now use everywhere - offering "Customise" again would do nothing.
  const customisableShared = useMemo(() => {
    const customisedBaseIds = new Set(mine.map((d) => d.baseModelDefinitionId).filter(Boolean));
    return shared.filter(
      (definition) =>
        !customisedBaseIds.has(definition.id) &&
        matchesSearch(definition.name, search) &&
        matchesVisibility(definition, visibility),
    );
  }, [shared, mine, search, visibility]);

  const visibleMine = useMemo(
    () => mine.filter((definition) => matchesVisibility(definition, visibility)),
    [mine, visibility],
  );
  const bulk = bulkHiddenIntent(
    customisableShared.filter((definition) => !hideDisabledReason(definition, factionsById)),
  );

  const editorFactions = useMemo(
    () => factions.filter((faction) => !faction.hidden || faction.id === editing?.factionId),
    [factions, editing],
  );

  const aside = useMemo(() => {
    if (isAuthLoading || loading) return null;
    const customisedBaseIds = new Set(mine.map((definition) => definition.baseModelDefinitionId).filter(Boolean));
    const uncustomisedShared = shared.filter((definition) => !customisedBaseIds.has(definition.id));
    return (
      <PersonalCatalogueAside
        title="Your models"
        description="Types you have added or customised, and how many you have taken out of pickers."
        authorised={isAuthenticated}
        unauthorisedMessage="Sign in to create and customise your own model definitions."
        loadFailed={loadFailed}
        failedMessage="Your model definitions could not be loaded."
        mineCount={mine.length}
        origins={countMineOrigins(mine, (definition) => definition.baseModelDefinitionId)}
        sharedCount={shared.length}
        pickerVisibility={countPickerVisibility(mine, uncustomisedShared)}
      />
    );
  }, [isAuthLoading, loading, isAuthenticated, loadFailed, mine, shared]);
  useAsideContent(aside);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>My Model Definitions</Title>
          <Text c="dimmed">
            Add model types of your own, or tweak the shared ones. Hide any you never collect so they stop appearing
            when you add a model.
          </Text>
        </div>
        {isAuthenticated && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Create your own
          </Button>
        )}
      </Group>

      {loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          Your model definitions could not be loaded. Reload the page to try again.
        </Alert>
      )}

      <PageGate
        isAuthLoading={isAuthLoading}
        isAuthorised={isAuthenticated}
        loading={loading}
        unauthorisedMessage="Sign in to create and customise your own model definitions."
      >
        <Stack gap="lg">
          <Group justify="flex-end">
            <CatalogueVisibilityFilter value={visibility} onChange={setVisibility} />
          </Group>
          <div>
            <Title order={4} mb="xs">
              Yours
            </Title>
            <CatalogueMineBody
              mineEmpty={mine.length === 0}
              loadFailed={loadFailed}
              emptyMineMessage="You have not added or customised any model definitions yet. Customise one below to get started."
              filteredEmpty={visibleMine.length === 0}
              table={
                <MyDefinitionsTable
                  definitions={visibleMine}
                  diffsById={diffsById}
                  factionsById={factionsById}
                  removingIds={removingIds}
                  hidingIds={hidingIds}
                  onEdit={setEditing}
                  onDiff={setDiffTarget}
                  onRemove={handleRemove}
                  onSetHidden={handleSetHidden}
                />
              }
            />
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Title order={4}>Shared catalogue</Title>
              <Group gap="xs">
                {bulk && bulk.ids.length > 1 && (
                  <Button
                    size="compact-sm"
                    variant="default"
                    loading={bulk.ids.some((id) => hidingIds.has(id))}
                    onClick={() => handleSetHidden(bulk.ids, bulk.hidden)}
                  >
                    {bulk.hidden ? "Hide these from pickers" : "Show these in pickers"}
                  </Button>
                )}
                <TextInput
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  w={220}
                />
              </Group>
            </Group>
            <SharedCatalogueTable
              definitions={customisableShared}
              factionsById={factionsById}
              customisingIds={customisingIds}
              hidingIds={hidingIds}
              emptyMessage={
                shared.length === 0 || search.trim() !== "" || visibility !== "all"
                  ? "Nothing matches."
                  : "Nothing left to customise."
              }
              onCustomise={handleCustomise}
              onSetHidden={handleSetHidden}
            />
          </div>
        </Stack>
      </PageGate>

      <Modal opened={createOpened} onClose={closeCreate} title="Create your own model definition">
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput label="Name" value={newName} onChange={(e) => setNewName(e.currentTarget.value)} required />
            <Group justify="flex-end">
              <Button type="submit">Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {editing && (
        <PersonalModelDefinitionEditor
          definition={editing}
          factions={editorFactions}
          wargearDefinitions={wargearDefinitions}
          onClose={() => setEditing(null)}
          onSaved={upsertMine}
        />
      )}

      <DefinitionDiffModal
        opened={diffTarget !== null}
        onClose={() => setDiffTarget(null)}
        definitionName={diffTarget?.name ?? ""}
        diff={diffTarget ? (diffsById.get(diffTarget.id ?? "") ?? null) : null}
        labels={PERSONAL_DIFF_LABELS}
      />
    </Stack>
  );
}
