import { Button, Group, Text, Title } from "@mantine/core";
import { IconDownload, IconPlus } from "@tabler/icons-react";

export type CollectionsHeaderProps = Readonly<{
  isAuthenticated: boolean;
  isUser: boolean;
  open: () => void;
  onExport: () => void;
  canExport: boolean;
}>;

export function CollectionsHeader({
  isAuthenticated,
  isUser,
  open,
  onExport,
  canExport,
}: CollectionsHeaderProps) {
  return (
    <Group justify="space-between">
      <div>
        <Title order={2}>Collections</Title>
        <Text c="dimmed">Create and manage your miniature collections.</Text>
      </div>

      {isAuthenticated && (
        <Group gap="sm">
          <Button
            variant="default"
            leftSection={<IconDownload size={16} />}
            onClick={onExport}
            disabled={!canExport}
          >
            Export
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={open} disabled={!isUser}>
            Create collection
          </Button>
        </Group>
      )}
    </Group>
  );
}
