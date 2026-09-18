import { Text } from "@mantine/core";
import type { ReactNode } from "react";

type CatalogueMineBodyProps = Readonly<{
  mineEmpty: boolean;
  loadFailed: boolean;
  emptyMineMessage: string;
  filteredEmpty: boolean;
  table: ReactNode;
}>;

/**
 * The "Yours" list: empty because there is nothing, empty because the filter hid it, or the table.
 * A failed load stays silent here — the page already said the list could not be loaded.
 */
export default function CatalogueMineBody({
  mineEmpty,
  loadFailed,
  emptyMineMessage,
  filteredEmpty,
  table,
}: CatalogueMineBodyProps) {
  if (mineEmpty) {
    return loadFailed ? null : <Text c="dimmed">{emptyMineMessage}</Text>;
  }
  if (filteredEmpty) {
    return <Text c="dimmed">None of yours match this filter.</Text>;
  }
  return table;
}
