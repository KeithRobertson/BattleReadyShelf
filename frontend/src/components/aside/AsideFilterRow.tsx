import { Group, Text, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";

export type AsideFilterRowProps = Readonly<{
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
  leading?: ReactNode;
  fullWidth?: boolean;
  actionTitle?: string;
}>;

/** A count row that can optionally set a page filter when clicked. */
export function AsideFilterRow({
  label,
  count,
  active = false,
  onClick,
  leading,
  fullWidth = false,
  actionTitle,
}: AsideFilterRowProps) {
  const content = (
    <Group justify="space-between" gap={8} wrap="nowrap">
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        {leading}
        <Text size="xs" c={active ? undefined : "dimmed"} fw={active ? 600 : undefined} truncate>
          {label}
        </Text>
      </Group>
      <Text size="xs" fw={600}>
        {count}
      </Text>
    </Group>
  );

  if (!onClick) {
    return fullWidth ? <div style={{ gridColumn: "1 / -1" }}>{content}</div> : content;
  }

  return (
    <UnstyledButton
      onClick={onClick}
      w="100%"
      aria-pressed={active}
      title={actionTitle ?? (active ? `Clear ${label} filter` : `Filter by ${label}`)}
      style={{ cursor: "pointer", borderRadius: 4, gridColumn: fullWidth ? "1 / -1" : undefined }}
    >
      {content}
    </UnstyledButton>
  );
}
