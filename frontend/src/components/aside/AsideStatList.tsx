import { Group, Stack, Text } from "@mantine/core";
import type { CountItem } from "@/utils/admin/catalogueStats";

export type AsideStatListProps = Readonly<{
  title?: string;
  items: CountItem[];
  /** Drop rows whose count is zero. Useful for long catalogues; keep off for a complete role list. */
  hideEmpty?: boolean;
}>;

export function AsideStatList({ title, items, hideEmpty = false }: AsideStatListProps) {
  const visible = hideEmpty ? items.filter((item) => item.count > 0) : items;
  if (visible.length === 0) return null;

  return (
    <Stack gap={4}>
      {title && (
        <Text size="sm" fw={600}>
          {title}
        </Text>
      )}
      {visible.map((item) => (
        <Group key={item.key} justify="space-between" gap={8} wrap="nowrap">
          <Text size="xs" c="dimmed" truncate>
            {item.label}
          </Text>
          <Text size="xs" fw={600}>
            {item.count}
          </Text>
        </Group>
      ))}
    </Stack>
  );
}
