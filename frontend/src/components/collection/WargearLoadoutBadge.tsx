import { Badge } from "@mantine/core";
import { IconLink, IconMagnet } from "@tabler/icons-react";
import type { LoadoutDisplayItem } from "@/utils/collection/loadoutDisplayItems.ts";

export type WargearLoadoutBadgeProps = Readonly<{
  item: LoadoutDisplayItem;
  /** Shrink the chip to its column and ellipsize the label. */
  truncate?: boolean;
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
export function WargearLoadoutBadge({ item, truncate = false }: WargearLoadoutBadgeProps) {
  const left = item.linked || item.magnetized;
  return (
    <Badge
      variant={item.linked || item.magnetized ? "filled" : "light"}
      color={wargearBadgeColor(item.optionName, item.customLabel)}
      size="sm"
      maw={truncate ? "100%" : undefined}
      style={truncate ? { flex: "1 1 auto", minWidth: 0, maxWidth: "100%" } : { flexShrink: 0 }}
      leftSection={
        left ? (
          <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }}>
            {item.magnetized ? <IconMagnet size={12} aria-hidden /> : null}
            {item.linked ? <IconLink size={12} aria-hidden /> : null}
          </span>
        ) : undefined
      }
      title={item.title ?? (truncate ? badgeLabel(item) : undefined)}
    >
      {badgeLabel(item)}
    </Badge>
  );
}
