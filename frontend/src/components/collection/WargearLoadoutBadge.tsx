import { Badge } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";
import type { LoadoutDisplayItem } from "@/utils/collection/loadoutDisplayItems.ts";

export type WargearLoadoutBadgeProps = Readonly<{
  item: LoadoutDisplayItem;
}>;

function wargearBadgeColor(optionName: string | undefined, customLabel: string | null | undefined): string {
  if (optionName) return "blue";
  if (customLabel) return "grape";
  return "gray";
}

/** One loadout chip. A two-handed item is filled with a link icon; two copies stay separate light chips. */
export function WargearLoadoutBadge({ item }: WargearLoadoutBadgeProps) {
  return (
    <Badge
      variant={item.linked ? "filled" : "light"}
      color={wargearBadgeColor(item.optionName, item.customLabel)}
      size="sm"
      leftSection={item.linked ? <IconLink size={12} /> : undefined}
      title={item.title}
    >
      {item.slotLabel}: {item.wargearLabel ?? "Unassigned"}
    </Badge>
  );
}
