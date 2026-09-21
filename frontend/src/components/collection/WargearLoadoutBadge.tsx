import { Badge } from "@mantine/core";
import { IconLink, IconMagnet } from "@tabler/icons-react";
import type { LoadoutDisplayItem } from "@/utils/collection/loadoutDisplayItems.ts";

export type WargearLoadoutBadgeProps = Readonly<{
  item: LoadoutDisplayItem;
}>;

function wargearBadgeColor(optionName: string | undefined, customLabel: string | null | undefined): string {
  if (optionName) return "blue";
  if (customLabel) return "grape";
  return "gray";
}

function badgeLabel(item: LoadoutDisplayItem): string {
  const extra = item.extraBitCount > 0 ? ` +${item.extraBitCount}` : "";
  return `${item.slotLabel}: ${item.wargearLabel ?? "Unassigned"}${extra}`;
}

/** One loadout chip. A two-handed item is filled with a link icon; two copies stay separate light chips. */
export function WargearLoadoutBadge({ item }: WargearLoadoutBadgeProps) {
  const left = item.linked || item.magnetized;
  return (
    <Badge
      variant={item.linked || item.magnetized ? "filled" : "light"}
      color={wargearBadgeColor(item.optionName, item.customLabel)}
      size="sm"
      leftSection={
        left ? (
          <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
            {item.magnetized ? <IconMagnet size={12} aria-hidden /> : null}
            {item.linked ? <IconLink size={12} aria-hidden /> : null}
          </span>
        ) : undefined
      }
      title={item.title}
    >
      {badgeLabel(item)}
    </Badge>
  );
}
