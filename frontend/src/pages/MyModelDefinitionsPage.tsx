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
import PersonalModelDefinitionEditor from "@/components/mydefinitions/PersonalModelDefinitionEditor.tsx";
import PageGate from "@/components/PageGate.tsx";
import type { Faction, ModelDefinition, WargearDefinition } from "@/generated";
import {
  createMyModelDefinition,
  customiseModelDefinition,
  deleteMyModelDefinition,
  getAvailableWargearDefinitions,
  getFactionsList,
  getMyModelDefinitions,
  getSharedModelDefinitions,
} from "@/generated";
import { MODEL_DEFINITIONS_KEY } from "@/queryKeys.ts";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";
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

type MineTableProps = Readonly<{
  definitions: ModelDefinition[];
  diffsById: Map<string, DraftDiff>;
  factionsById: Map<string, Faction>;
  removingIds: Set<string>;
  onEdit: (definition: ModelDefinition) => void;
  onDiff: (definition: ModelDefinition) => void;
  onRemove: (definition: ModelDefinition) => void;
}>;

function MyDefinitionsTable({
  definitions,
  diffsById,
  factionsById,
  removingIds,
  onEdit,
  onDiff,
  onRemove,
}: MineTableProps) {
  return (
    <Table striped withTableBorder verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Faction</Table.Th>
          <Table.Th>Origin</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {definitions.map((definition) => {
          const id = definition.id ?? "";
          const isCustomisation = definition.baseModelDefinitionId != null;
          return (
            <Table.Tr key={id}>
              <Table.Td>{definition.name}</Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {factionLabel(definition, factionsById)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <OriginBadge definition={definition} />
                  <ChangeCountBadge diff={diffsById.get(id)} />
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  <Tooltip label="Compare with the shared version">
                    <ActionIcon variant="subtle" aria-label="Compare with shared" onClick={() => onDiff(definition)}>
                      <IconGitCompare size={16} />
                    </ActionIcon>
                  </Tooltip>
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
    </Table>
  );
}

type SharedTableProps = Readonly<{
  definitions: ModelDefinition[];
  factionsById: Map<string, Faction>;
  customisingIds: Set<string>;
  onCustomise: (definition: ModelDefinition) => void;
}>;

function SharedCatalogueTable({ definitions, factionsById, customisingIds, onCustomise }: SharedTableProps) {
  if (definitions.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Nothing left to customise.
      </Text>
    );
  }
  return (
    <Table striped withTableBorder verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Faction</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {definitions.map((definition) => (
          <Table.Tr key={definition.id}>
            <Table.Td>{definition.name}</Table.Td>
            <Table.Td>
              <Text size="sm" c="dimmed">
                {factionLabel(definition, factionsById)}
              </Text>
            </Table.Td>
            <Table.Td>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  loading={customisingIds.has(definition.id ?? "")}
                  onClick={() => onCustomise(definition)}
                >
                  Customise
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

export default function MyModelDefinitionsPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [mine, setMine] = useState<ModelDefinition[]>([]);
  const [shared, setShared] = useState<ModelDefinition[]>([]);
  const [factions, setFactions] = useState<Faction[]>([]);
  const [wargearDefinitions, setWargearDefinitions] = useState<WargearDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ModelDefinition | null>(null);
  const [diffTarget, setDiffTarget] = useState<ModelDefinition | null>(null);
  const [customisingIds, setCustomisingIds] = useState<Set<string>>(new Set());
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [newName, setNewName] = useState("");
  const [search, setSearch] = useState("");
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
      Promise.all([
        getMyModelDefinitions({ signal }),
        getSharedModelDefinitions({ signal }),
        getFactionsList({ signal }),
        getAvailableWargearDefinitions({ signal }),
      ])
        .then(([mineRes, sharedRes, factionsRes, wargearRes]) => {
          if (signal?.aborted) return;
          setMine(mineRes.data ?? []);
          setShared(sharedRes.data ?? []);
          setFactions(factionsRes.data ?? []);
          setWargearDefinitions(wargearRes.data ?? []);
        })
        .catch((e) => {
          if (!signal?.aborted) setError(extractErrorMessage(e));
        })
        .finally(() => {
          if (!signal?.aborted) setLoading(false);
        });
    },
    [isAuthenticated],
  );

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
    setError(null);
    withBusy(setCustomisingIds, id, true);
    try {
      const created = (await customiseModelDefinition({ path: { modelDefinitionId: id } })).data;
      if (!created) {
        setError("Failed to customise this model definition");
        return;
      }
      upsertMine(created);
      setEditing(created);
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      withBusy(setCustomisingIds, id, false);
    }
  }

  async function handleRemove(definition: ModelDefinition) {
    const id = definition.id ?? "";
    setError(null);
    withBusy(setRemovingIds, id, true);
    try {
      await deleteMyModelDefinition({ path: { modelDefinitionId: id } });
      setMine((current) => current.filter((d) => d.id !== id));
      invalidateCatalogue();
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      withBusy(setRemovingIds, id, false);
    }
  }

  async function handleCreate(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    try {
      const created = (
        await createMyModelDefinition({ body: { name: newName, attachmentSlots: [], wargearOptions: [] } })
      ).data;
      if (!created) {
        setError("Failed to create model definition");
        return;
      }
      upsertMine(created);
      setNewName("");
      closeCreate();
      setEditing(created);
    } catch (e) {
      setError(extractErrorMessage(e));
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

  // A shared definition the user has already customised is hidden here, because their version is
  // what they now use everywhere - offering "Customise" again would do nothing.
  const customisableShared = useMemo(() => {
    const customisedBaseIds = new Set(mine.map((d) => d.baseModelDefinitionId).filter(Boolean));
    const term = search.trim().toLowerCase();
    return shared.filter(
      (definition) =>
        !customisedBaseIds.has(definition.id) && (term === "" || definition.name.toLowerCase().includes(term)),
    );
  }, [shared, mine, search]);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>My Model Definitions</Title>
          <Text c="dimmed">
            Add model types of your own, or tweak the shared ones. Everything here is visible only to you.
          </Text>
        </div>
        {isAuthenticated && (
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Create your own
          </Button>
        )}
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} style={{ whiteSpace: "pre-line" }}>
          {error}
        </Alert>
      )}

      <PageGate
        isAuthLoading={isAuthLoading}
        isAuthorised={isAuthenticated}
        loading={loading}
        unauthorisedMessage="Sign in to create and customise your own model definitions."
      >
        <Stack gap="lg">
          <div>
            <Title order={4} mb="xs">
              Yours
            </Title>
            {mine.length === 0 ? (
              <Text c="dimmed">
                You have not added or customised any model definitions yet. Customise one below to get started.
              </Text>
            ) : (
              <MyDefinitionsTable
                definitions={mine}
                diffsById={diffsById}
                factionsById={factionsById}
                removingIds={removingIds}
                onEdit={setEditing}
                onDiff={setDiffTarget}
                onRemove={handleRemove}
              />
            )}
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Title order={4}>Shared catalogue</Title>
              <TextInput
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={220}
              />
            </Group>
            <SharedCatalogueTable
              definitions={customisableShared}
              factionsById={factionsById}
              customisingIds={customisingIds}
              onCustomise={handleCustomise}
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
          factions={factions}
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
