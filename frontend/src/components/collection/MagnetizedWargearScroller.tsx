import { ActionIcon, Badge, UnstyledButton } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { CollectionModel, WargearOption } from "@/generated";
import {
  bitKey,
  bitsForSlot,
  equippedSelection,
  isEquippedBit,
  selectionLabel,
} from "@/utils/collection/modelLoadout.ts";

export type MagnetizedWargearScrollerProps = Readonly<{
  model: CollectionModel;
  slotId: string;
  slotName: string;
  options: WargearOption[];
  disabled?: boolean;
  onEquip: (key: string) => void;
  onRemove: (key: string) => void;
}>;

/** Horizontally scrollable chips for the bits owned on a magnetised slot. */
export function MagnetizedWargearScroller({
  model,
  slotId,
  slotName,
  options,
  disabled,
  onEquip,
  onRemove,
}: MagnetizedWargearScrollerProps) {
  const bits = bitsForSlot(model, slotId);
  if (bits.length === 0) {
    return null;
  }
  const filledCount = bits.length;
  const equipped = equippedSelection(model, slotId);

  return (
    <div
      role="listbox"
      aria-label={`${slotName} magnetised options`}
      aria-disabled={disabled}
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        scrollSnapType: "x mandatory",
        paddingBottom: 4,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {bits.map((bit) => {
        const key = bitKey(bit);
        const selected = equipped !== undefined && bitKey(equipped) === key && isEquippedBit(bit, filledCount);
        const label = selectionLabel(bit, options);
        return (
          <Badge
            key={key}
            role="option"
            aria-selected={selected}
            variant={selected ? "filled" : "light"}
            color={bit.customLabel ? "grape" : "blue"}
            size="sm"
            tt="none"
            style={{ scrollSnapAlign: "start", flex: "0 0 auto", maxWidth: 180 }}
            rightSection={
              <ActionIcon
                size={14}
                variant="transparent"
                color={selected ? "white" : "gray"}
                aria-label={`Remove ${label} from ${slotName}`}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  onRemove(key);
                }}
              >
                <IconX size={10} />
              </ActionIcon>
            }
          >
            <UnstyledButton
              disabled={disabled}
              onClick={() => onEquip(key)}
              style={{ color: "inherit", maxWidth: 140 }}
              title={selected ? `${label} is attached` : `Attach ${label}`}
            >
              {label}
            </UnstyledButton>
          </Badge>
        );
      })}
    </div>
  );
}
