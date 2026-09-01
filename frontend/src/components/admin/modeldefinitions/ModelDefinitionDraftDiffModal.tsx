import { Alert, Badge, Group, Modal, Stack, Table, Text, Title } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import type { ChangeKind, ChildChange, DraftDiff, FieldChange } from "@/utils/modelDefinitionDraftDiff";

const KIND_COLOR: Record<ChangeKind, string> = { added: "green", removed: "red", changed: "blue" };
const KIND_LABEL: Record<ChangeKind, string> = { added: "Added", removed: "Removed", changed: "Changed" };

const NOT_SET = "—";

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

function FieldChangeRows({ changes }: Readonly<{ changes: FieldChange[] }>) {
  return (
    <Table verticalSpacing="xs" withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th style={{ width: "25%" }}>Field</Table.Th>
          <Table.Th style={{ width: "37.5%" }}>Published</Table.Th>
          <Table.Th style={{ width: "37.5%" }}>Draft</Table.Th>
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
    </Table>
  );
}

function ChildChangeDetails({ change }: Readonly<{ change: ChildChange }>) {
  if (change.fields.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {change.kind === "added" ? "Not in the published definition" : "No longer in the draft"}
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

function ChildChangeSection({ title, changes }: Readonly<{ title: string; changes: ChildChange[] }>) {
  if (changes.length === 0) return null;
  return (
    <div>
      <Title order={6} mb={4}>
        {title}
      </Title>
      <Table verticalSpacing="xs" withTableBorder>
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
                <ChildChangeDetails change={change} />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  );
}

function DiffSections({ diff }: Readonly<{ diff: DraftDiff }>) {
  return (
    <>
      {diff.details.length > 0 && (
        <div>
          <Title order={6} mb={4}>
            Details
          </Title>
          <FieldChangeRows changes={diff.details} />
        </div>
      )}
      <ChildChangeSection title="Attachment slots" changes={diff.attachmentSlots} />
      <ChildChangeSection title="Wargear options" changes={diff.wargearOptions} />
    </>
  );
}

/** Chooses between the three mutually exclusive ways a draft can differ from what is published. */
function DraftDiffBody({ diff }: Readonly<{ diff: DraftDiff | null }>) {
  if (diff === null) return null;

  if (diff.isNew) {
    return (
      <Stack gap="md">
        <Alert color="grape" icon={<IconInfoCircle size={16} />}>
          This is a brand-new model definition, so everything in it will be added when published.
        </Alert>
        <DiffSections diff={diff} />
      </Stack>
    );
  }

  if (diff.changeCount === 0) {
    return (
      <Alert color="gray" icon={<IconInfoCircle size={16} />}>
        This draft is identical to the published definition — publishing it would change nothing.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <DiffSections diff={diff} />
    </Stack>
  );
}

type ModelDefinitionDraftDiffModalProps = Readonly<{
  opened: boolean;
  onClose: () => void;
  draftName: string;
  diff: DraftDiff | null;
}>;

export default function ModelDefinitionDraftDiffModal({
  opened,
  onClose,
  draftName,
  diff,
}: ModelDefinitionDraftDiffModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={`Changes to "${draftName}"`} size="xl">
      <DraftDiffBody diff={diff} />
    </Modal>
  );
}
