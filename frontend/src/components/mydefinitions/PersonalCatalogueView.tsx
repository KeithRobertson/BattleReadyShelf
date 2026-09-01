import { ActionIcon, Alert, Badge, Button, Group, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import { IconAlertCircle, IconArrowBackUp, IconGitCompare, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { type ReactNode, useMemo, useState } from "react";
import type { PersonalDefinition } from "@/components/mydefinitions/usePersonalCatalogue.ts";
import PageGate from "@/components/PageGate.tsx";
import type { DraftDiff } from "@/utils/modelDefinitionDraftDiff";

/** One extra column between the name and the origin badges, rendered per row. */
export interface PersonalCatalogueColumn<T> {
  header: string;
  render: (item: T) => ReactNode;
}

/** Says at a glance whether a row is a tweak to a shared definition or something the user invented. */
function OriginBadge({ isCustomisation }: Readonly<{ isCustomisation: boolean }>) {
  if (isCustomisation) {
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

type MineTableProps<T extends PersonalDefinition> = Readonly<{
  items: T[];
  columns: PersonalCatalogueColumn<T>[];
  baseIdOf: (item: T) => string | null | undefined;
  diffsById: Map<string, DraftDiff>;
  removingIds: Set<string>;
  revertLabel: string;
  onEdit: (item: T) => void;
  onDiff: (item: T) => void;
  onRemove: (item: T) => void;
}>;

function MineTable<T extends PersonalDefinition>({
  items,
  columns,
  baseIdOf,
  diffsById,
  removingIds,
  revertLabel,
  onEdit,
  onDiff,
  onRemove,
}: MineTableProps<T>) {
  return (
    <ResponsiveTable striped withTableBorder verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          {columns.map((column) => (
            <Table.Th key={column.header}>{column.header}</Table.Th>
          ))}
          <Table.Th>Origin</Table.Th>
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((item) => {
          const id = item.id ?? "";
          const isCustomisation = baseIdOf(item) != null;
          return (
            <Table.Tr key={id}>
              <Table.Td>{item.name}</Table.Td>
              {columns.map((column) => (
                <Table.Td key={column.header}>{column.render(item)}</Table.Td>
              ))}
              <Table.Td>
                <Group gap="xs">
                  <OriginBadge isCustomisation={isCustomisation} />
                  <ChangeCountBadge diff={diffsById.get(id)} />
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end" wrap="nowrap">
                  <Tooltip label="Compare with the shared version">
                    <ActionIcon variant="subtle" aria-label="Compare with shared" onClick={() => onDiff(item)}>
                      <IconGitCompare size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Edit">
                    <ActionIcon variant="light" aria-label="Edit" onClick={() => onEdit(item)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={isCustomisation ? revertLabel : "Delete"}>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      aria-label={isCustomisation ? revertLabel : "Delete"}
                      loading={removingIds.has(id)}
                      onClick={() => onRemove(item)}
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

type SharedTableProps<T extends PersonalDefinition> = Readonly<{
  items: T[];
  columns: PersonalCatalogueColumn<T>[];
  customisingIds: Set<string>;
  onCustomise: (item: T) => void;
}>;

function SharedTable<T extends PersonalDefinition>({
  items,
  columns,
  customisingIds,
  onCustomise,
}: SharedTableProps<T>) {
  if (items.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        Nothing left to customise.
      </Text>
    );
  }
  return (
    <ResponsiveTable striped withTableBorder verticalSpacing="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          {columns.map((column) => (
            <Table.Th key={column.header}>{column.header}</Table.Th>
          ))}
          <Table.Th />
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {items.map((item) => (
          <Table.Tr key={item.id}>
            <Table.Td>{item.name}</Table.Td>
            {columns.map((column) => (
              <Table.Td key={column.header}>{column.render(item)}</Table.Td>
            ))}
            <Table.Td>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  variant="light"
                  loading={customisingIds.has(item.id ?? "")}
                  onClick={() => onCustomise(item)}
                >
                  Customise
                </Button>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </ResponsiveTable>
  );
}

type PersonalCatalogueViewProps<T extends PersonalDefinition> = Readonly<{
  title: string;
  description: string;
  createLabel: string;
  emptyMineMessage: string;
  unauthorisedMessage: string;
  sharedTitle: string;
  revertLabel: string;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  loading: boolean;
  error: string | null;
  mine: T[];
  shared: T[];
  columns: PersonalCatalogueColumn<T>[];
  baseIdOf: (item: T) => string | null | undefined;
  diffsById: Map<string, DraftDiff>;
  customisingIds: Set<string>;
  removingIds: Set<string>;
  onCreate: () => void;
  onEdit: (item: T) => void;
  onDiff: (item: T) => void;
  onCustomise: (item: T) => void;
  onRemove: (item: T) => void;
  /** Modals the page owns, rendered inside this layout so it can stay the page's only root. */
  children?: ReactNode;
}>;

/**
 * The layout every "my definitions" page shares: what you own at the top, the shared catalogue
 * underneath with a Customise button on each row that you have not forked yet.
 */
export default function PersonalCatalogueView<T extends PersonalDefinition>({
  title,
  description,
  createLabel,
  emptyMineMessage,
  unauthorisedMessage,
  sharedTitle,
  revertLabel,
  isAuthenticated,
  isAuthLoading,
  loading,
  error,
  mine,
  shared,
  columns,
  baseIdOf,
  diffsById,
  customisingIds,
  removingIds,
  onCreate,
  onEdit,
  onDiff,
  onCustomise,
  onRemove,
  children,
}: PersonalCatalogueViewProps<T>) {
  const [search, setSearch] = useState("");

  // A shared definition the user has already forked is hidden, because offering "Customise" a
  // second time would just hand back the copy they already have.
  const customisableShared = useMemo(() => {
    const customisedBaseIds = new Set(mine.map(baseIdOf).filter(Boolean));
    const term = search.trim().toLowerCase();
    return shared.filter(
      (item) => !customisedBaseIds.has(item.id) && (term === "" || item.name.toLowerCase().includes(term)),
    );
  }, [shared, mine, search, baseIdOf]);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed">{description}</Text>
        </div>
        {isAuthenticated && (
          <Button leftSection={<IconPlus size={16} />} onClick={onCreate}>
            {createLabel}
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
        unauthorisedMessage={unauthorisedMessage}
      >
        <Stack gap="lg">
          <div>
            <Title order={4} mb="xs">
              Yours
            </Title>
            {mine.length === 0 ? (
              <Text c="dimmed">{emptyMineMessage}</Text>
            ) : (
              <MineTable
                items={mine}
                columns={columns}
                baseIdOf={baseIdOf}
                diffsById={diffsById}
                removingIds={removingIds}
                revertLabel={revertLabel}
                onEdit={onEdit}
                onDiff={onDiff}
                onRemove={onRemove}
              />
            )}
          </div>

          <div>
            <Group justify="space-between" mb="xs">
              <Title order={4}>{sharedTitle}</Title>
              <TextInput
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={220}
              />
            </Group>
            <SharedTable
              items={customisableShared}
              columns={columns}
              customisingIds={customisingIds}
              onCustomise={onCustomise}
            />
          </div>
        </Stack>
      </PageGate>

      {children}
    </Stack>
  );
}
