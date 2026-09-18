import { Anchor, Button, Divider, Stack, Text } from "@mantine/core";
import { IconCircleCheck, IconTrash } from "@tabler/icons-react";
import { AdminHealthAside } from "@/components/admin/aside/AdminHealthAside.tsx";
import { OPEN_DRAFTS_ELEMENT_ID, scrollToElementId } from "@/components/admin/aside/adminAside.ts";
import type { CountItem } from "@/utils/admin/catalogueStats";

export type ModelDefinitionsAdminAsideProps = Readonly<{
  loadFailed: boolean;
  publishedCount: number;
  draftCount: number;
  draftStatusCounts: CountItem[];
  publishedByFaction: CountItem[];
  selectedDraftCount: number;
  selectedPublishedCount: number;
  publishingSelected: boolean;
  discarding: boolean;
  deletingSelected: boolean;
  onPublishSelected: () => void;
  onDiscardSelected: () => void;
  onDeleteSelected: () => void;
}>;

function OpenDraftsStat({ count }: Readonly<{ count: number }>) {
  if (count === 0) {
    return (
      <Text size="sm" c="dimmed">
        No open drafts
      </Text>
    );
  }

  const label = count === 1 ? "1 open draft — jump to list" : `${count} open drafts — jump to list`;
  return (
    <Anchor
      component="button"
      type="button"
      size="sm"
      ta="left"
      onClick={() => scrollToElementId(OPEN_DRAFTS_ELEMENT_ID)}
    >
      {label}
    </Anchor>
  );
}

export function ModelDefinitionsAdminAside({
  loadFailed,
  publishedCount,
  draftCount,
  draftStatusCounts,
  publishedByFaction,
  selectedDraftCount,
  selectedPublishedCount,
  publishingSelected,
  discarding,
  deletingSelected,
  onPublishSelected,
  onDiscardSelected,
  onDeleteSelected,
}: ModelDefinitionsAdminAsideProps) {
  return (
    <AdminHealthAside
      title="Model definitions"
      description="Shared catalogue types. Drafts stay private until you publish them."
      loadFailed={loadFailed}
      failedMessage="The model definitions could not be loaded."
      totalLabel="Published"
      total={publishedCount}
      lists={[
        { title: "Drafts", items: draftStatusCounts },
        { title: "Published by faction", items: publishedByFaction, hideEmpty: true },
      ]}
    >
      <Divider />
      <OpenDraftsStat count={draftCount} />
      {selectedDraftCount > 0 && (
        <Stack gap="xs">
          <Divider />
          <Text size="sm" fw={600}>
            {selectedDraftCount} drafts selected
          </Text>
          <Button
            size="xs"
            color="green"
            leftSection={<IconCircleCheck size={14} />}
            loading={publishingSelected}
            onClick={onPublishSelected}
          >
            Publish selected
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconTrash size={14} />}
            loading={discarding}
            onClick={onDiscardSelected}
          >
            Discard selected
          </Button>
        </Stack>
      )}
      {selectedPublishedCount > 0 && (
        <Stack gap="xs">
          <Divider />
          <Text size="sm" fw={600}>
            {selectedPublishedCount} published selected
          </Text>
          <Button
            size="xs"
            color="red"
            variant="light"
            leftSection={<IconTrash size={14} />}
            loading={deletingSelected}
            onClick={onDeleteSelected}
          >
            Delete selected
          </Button>
        </Stack>
      )}
    </AdminHealthAside>
  );
}
