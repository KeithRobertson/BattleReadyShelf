import { Divider, Group, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import { AsideStatList } from "@/components/aside/AsideStatList.tsx";
import type { CountItem } from "@/utils/admin/catalogueStats";

export type PersonalCatalogueAsideList = Readonly<{
  title: string;
  items: CountItem[];
  hideEmpty?: boolean;
}>;

export type PersonalCatalogueAsideProps = Readonly<{
  title: string;
  description: string;
  authorised: boolean;
  unauthorisedMessage: string;
  loadFailed: boolean;
  failedMessage: string;
  mineCount: number;
  origins: CountItem[];
  sharedCount: number;
  pickerVisibility: CountItem[];
  extraLists?: readonly PersonalCatalogueAsideList[];
  children?: ReactNode;
}>;

function TotalRow({ label, total }: Readonly<{ label: string; total: number }>) {
  return (
    <Group justify="space-between" gap={8} wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={700}>
        {total}
      </Text>
    </Group>
  );
}

export function PersonalCatalogueAside({
  title,
  description,
  authorised,
  unauthorisedMessage,
  loadFailed,
  failedMessage,
  mineCount,
  origins,
  sharedCount,
  pickerVisibility,
  extraLists = [],
  children,
}: PersonalCatalogueAsideProps) {
  if (!authorised) {
    return <AsidePanel title={title} description={unauthorisedMessage} />;
  }
  if (loadFailed) {
    return <AsidePanel title={title} description={failedMessage} />;
  }

  return (
    <AsidePanel title={title} description={description}>
      <Stack gap="md">
        <Stack gap="xs">
          <TotalRow label="Yours" total={mineCount} />
          <AsideStatList items={origins} />
        </Stack>
        <Divider />
        <TotalRow label="Shared" total={sharedCount} />
        <Divider />
        <AsideStatList title="Pickers" items={pickerVisibility} />
        {extraLists
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
