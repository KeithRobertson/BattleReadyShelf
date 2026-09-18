import { Divider, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { PendingProposalsStat } from "@/components/admin/aside/PendingProposalsStat.tsx";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import { AsideStatList } from "@/components/aside/AsideStatList.tsx";
import type { CountItem } from "@/utils/admin/catalogueStats";

export type AdminHealthList = Readonly<{
  title: string;
  items: CountItem[];
  hideEmpty?: boolean;
}>;

export type AdminHealthAsideProps = Readonly<{
  title: string;
  description: string;
  loadFailed?: boolean;
  failedMessage: string;
  totalLabel: string;
  total: number;
  pendingCount?: number;
  lists?: readonly AdminHealthList[];
  children?: ReactNode;
}>;

export function AdminHealthAside({
  title,
  description,
  loadFailed = false,
  failedMessage,
  totalLabel,
  total,
  pendingCount,
  lists = [],
  children,
}: AdminHealthAsideProps) {
  if (loadFailed) {
    return <AsidePanel title={title} description={failedMessage} />;
  }

  return (
    <AsidePanel title={title} description={description}>
      <Stack gap="md">
        <Group justify="space-between" gap={8} wrap="nowrap">
          <Text size="xs" c="dimmed">
            {totalLabel}
          </Text>
          <Text size="sm" fw={700}>
            {total}
          </Text>
        </Group>
        {pendingCount !== undefined && (
          <>
            <Divider />
            <PendingProposalsStat count={pendingCount} />
          </>
        )}
        {lists
          .filter((list) => list.items.some((item) => (list.hideEmpty ? item.count > 0 : true)))
          .map((list) => (
            <Stack key={list.title} gap="xs">
              <Divider />
              <AsideStatList title={list.title} items={list.items} hideEmpty={list.hideEmpty} />
            </Stack>
          ))}
        {children}
      </Stack>
    </AsidePanel>
  );
}
