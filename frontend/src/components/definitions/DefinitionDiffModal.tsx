import { Alert, Badge, Group, Stack, Table, Text, Title } from "@mantine/core";
import ResponsiveTable from "@/components/ResponsiveTable.tsx";
import { IconInfoCircle } from "@tabler/icons-react";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { ChangeKind, ChildChange, DraftDiff, FieldChange } from "@/utils/modelDefinitionDraftDiff";

const KIND_COLOR: Record<ChangeKind, string> = { added: "green", removed: "red", changed: "blue" };
const KIND_LABEL: Record<ChangeKind, string> = { added: "Added", removed: "Removed", changed: "Changed" };

const NOT_SET = "—";

/**
 * The wording for one kind of comparison. The mechanics of a diff are the same whether an admin is
 * comparing a draft against what is published or a user is comparing their own definition against
 * the shared one, but calling both sides "Draft" and "Published" would be wrong for the latter.
 */
export interface DiffLabels {
  /** Column header for the definition being compared against. */
  before: string;
  /** Column header for the definition being compared. */
  after: string;
  /** Shown when there is nothing to compare against. */
  isNewMessage: string;
  /** Shown when the two sides are identical. */
  identicalMessage: string;
  /** Explains a child row that exists only on the "after" side. */
  childAdded: string;
  /** Explains a child row that exists only on the "before" side. */
  childRemoved: string;
}

export const DRAFT_DIFF_LABELS: DiffLabels = {
  before: "Published",
  after: "Draft",
  isNewMessage: "This is a brand-new model definition, so everything in it will be added when published.",
  identicalMessage: "This draft is identical to the published definition — publishing it would change nothing.",
  childAdded: "Not in the published definition",
  childRemoved: "No longer in the draft",
};

export const PERSONAL_DIFF_LABELS: DiffLabels = {
  before: "Shared",
  after: "Yours",
  isNewMessage: "You wrote this model definition yourself, so there is no shared version to compare it against.",
  identicalMessage: "Your version matches the shared definition exactly — you have not changed anything yet.",
  childAdded: "You added this",
  childRemoved: "You removed this",
};

function Before({ value }: Readonly<{ value: string | null }>) {
  if (value === null) return <Text c="dimmed">{NOT_SET}</Text>;
  return (
    <Text c="dimmed" td="line-through">
      {value}
    </Text>
  );
}

function After({ value }: Readonly<{ value: string | null }>) {
  if (value === null) return <Text c="dimmed">{NOT_SET}</Text>;
  return <Text fw={500}>{value}</Text>;
}

function FieldChangeRows({ changes, labels }: Readonly<{ changes: FieldChange[]; labels: DiffLabels }>) {
  return (
    <ResponsiveTable verticalSpacing="xs" withTableBorder minWidth={420}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: "25%" }}>Field</Table.Th>
          <Table.Th style={{ width: "37.5%" }}>{labels.before}</Table.Th>
          <Table.Th style={{ width: "37.5%" }}>{labels.after}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {changes.map((change) => (
          <Table.Tr key={change.label}>
            <Table.Td>{change.label}</Table.Td>
            <Table.Td>
              <Before value={change.before} />
            </Table.Td>
            <Table.Td>
              <After value={change.after} />
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </ResponsiveTable>
  );
}

function ChildChangeDetails({ change, labels }: Readonly<{ change: ChildChange; labels: DiffLabels }>) {
  if (change.fields.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {change.kind === "added" ? labels.childAdded : labels.childRemoved}
      </Text>
    );
  }
  return (
    <Stack gap={2}>
      {change.fields.map((field) => (
        <Group key={field.label} gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" style={{ minWidth: 110 }}>
            {field.label}
          </Text>
          <Before value={field.before} />
          <Text c="dimmed">→</Text>
          <After value={field.after} />
        </Group>
      ))}
    </Stack>
  );
}

function ChildChangeSection({
  title,
  changes,
  labels,
}: Readonly<{ title: string; changes: ChildChange[]; labels: DiffLabels }>) {
  if (changes.length === 0) return null;
  return (
    <div>
      <Title order={6} mb={4}>
        {title}
      </Title>
      <ResponsiveTable verticalSpacing="xs" withTableBorder minWidth={420}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 110 }}>Change</Table.Th>
            <Table.Th style={{ width: "30%" }}>Item</Table.Th>
            <Table.Th>Details</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {changes.map((change) => (
            <Table.Tr key={change.key}>
              <Table.Td>
                <Badge variant="light" color={KIND_COLOR[change.kind]}>
                  {KIND_LABEL[change.kind]}
                </Badge>
              </Table.Td>
              <Table.Td>{change.label}</Table.Td>
              <Table.Td>
                <ChildChangeDetails change={change} labels={labels} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </ResponsiveTable>
    </div>
  );
}

function DiffSections({ diff, labels }: Readonly<{ diff: DraftDiff; labels: DiffLabels }>) {
  return (
    <>
      {diff.details.length > 0 && (
        <div>
          <Title order={6} mb={4}>
            Details
          </Title>
          <FieldChangeRows changes={diff.details} labels={labels} />
        </div>
      )}
      <ChildChangeSection title="Attachment slots" changes={diff.attachmentSlots} labels={labels} />
      <ChildChangeSection title="Wargear options" changes={diff.wargearOptions} labels={labels} />
    </>
  );
}

/** Chooses between the three mutually exclusive ways one definition can differ from another. */
function DiffBody({ diff, labels }: Readonly<{ diff: DraftDiff | null; labels: DiffLabels }>) {
  if (diff === null) return null;

  if (diff.isNew) {
    return (
      <Stack gap="md">
        <Alert color="grape" icon={<IconInfoCircle size={16} />}>
          {labels.isNewMessage}
        </Alert>
        <DiffSections diff={diff} labels={labels} />
      </Stack>
    );
  }

  if (diff.changeCount === 0) {
    return (
      <Alert color="gray" icon={<IconInfoCircle size={16} />}>
        {labels.identicalMessage}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <DiffSections diff={diff} labels={labels} />
    </Stack>
  );
}

type DefinitionDiffModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  definitionName: string;
  diff: DraftDiff | null;
  labels: DiffLabels;
}>;

/**
 * Renders one definition's differences from another. Used for an admin draft against what is
 * published, and for a user's own definition against the shared one it was forked from - and for
 * factions and wargear, whose diffs carry only fields and leave the child sections empty.
 */
export default function DefinitionDiffModal({
  opened,
  onClose,
  definitionName,
  diff,
  labels,
}: DefinitionDiffModalProps) {
  return (
    <ResponsiveModal opened={opened} onClose={onClose} title={`Changes to "${definitionName}"`} size="xl">
      <DiffBody diff={diff} labels={labels} />
    </ResponsiveModal>
  );
}
