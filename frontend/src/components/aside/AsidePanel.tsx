import { Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

export type AsidePanelProps = Readonly<{
  title: string;
  description?: string;
  children?: ReactNode;
}>;

/** Shared heading for whatever a page puts in the app-shell aside. */
export function AsidePanel({ title, description, children }: AsidePanelProps) {
  return (
    <Stack gap="md">
      <div>
        <Title order={4}>{title}</Title>
        {description && (
          <Text c="dimmed" size="sm">
            {description}
          </Text>
        )}
      </div>
      {children}
    </Stack>
  );
}
