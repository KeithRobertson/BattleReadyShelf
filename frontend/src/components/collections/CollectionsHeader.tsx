import { Button, Group, Text, Title } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

export type CollectionsHeaderProps = Readonly<{
  isAuthenticated: boolean;
  isUser: boolean;
  open: () => void;
}>;

export function CollectionsHeader({ isAuthenticated, isUser, open }: CollectionsHeaderProps) {
  return (
    <Group justify="space-between">
      <div>
        <Title order={2}>Collections</Title>
        <Text c="dimmed">Create and manage your miniature collections.</Text>
      </div>

      {isAuthenticated && (
        <Button leftSection={<IconPlus size={16} />} onClick={open} disabled={!isUser}>
          Create collection
        </Button>
      )}
    </Group>
  );
}
