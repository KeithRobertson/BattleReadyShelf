import { Badge, Group, Text } from "@mantine/core";

export type CollectionCreatedByProps = Readonly<{ name: string }>;

export function CollectionCreatedBy({ name }: CollectionCreatedByProps) {
  return (
    <Group gap={6} align="center">
      <Text size="sm" c="dimmed">
        Created by
      </Text>
      <Badge variant="outline" color="gray" size="sm">
        {name}
      </Badge>
    </Group>
  );
}
