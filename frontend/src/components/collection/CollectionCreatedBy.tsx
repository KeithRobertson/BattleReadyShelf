import { Badge, Group, Text } from "@mantine/core";

export function CollectionCreatedBy({ name }: Readonly<{ name: string }>) {
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
