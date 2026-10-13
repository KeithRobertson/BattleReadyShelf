import { Badge, Group, Text } from "@mantine/core";
import { type RefObject, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WargearLoadoutBadge } from "@/components/collection/WargearLoadoutBadge.tsx";
import type { CollectionModel } from "@/generated";
import { fitLoadout, type LoadoutFit } from "@/utils/collection/fitLoadout.ts";
import loadoutDisplayItems, { type LoadoutDisplayItem } from "@/utils/collection/loadoutDisplayItems.ts";
import { allWargearOptions } from "@/utils/collection/modelLoadout.ts";

function readFit(container: HTMLElement, measure: HTMLElement): LoadoutFit {
  const chips = Array.from(measure.querySelectorAll<HTMLElement>("[data-loadout-chip]"));
  const more = measure.querySelector<HTMLElement>("[data-loadout-more]");
  const gap = Number.parseFloat(getComputedStyle(measure).columnGap);
  return fitLoadout(
    chips.map((chip) => chip.offsetWidth),
    container.clientWidth,
    more?.offsetWidth ?? 0,
    Number.isFinite(gap) ? gap : 0,
  );
}

function MoreButton({
  expanded,
  hiddenCount,
  onClick,
}: Readonly<{ expanded: boolean; hiddenCount: number; onClick: () => void }>) {
  return (
    <Badge
      component="button"
      type="button"
      variant="light"
      color="gray"
      size="sm"
      aria-expanded={expanded}
      aria-label={expanded ? "Show fewer loadout items" : `Show ${hiddenCount} more loadout items`}
      onClick={onClick}
      style={{ cursor: "pointer", flexShrink: 0 }}
    >
      {expanded ? "Less" : `+${hiddenCount}`}
    </Badge>
  );
}

/**
 * One line of the equipped build. Chips that do not fit collapse behind a "+n" button, which
 * opens the rest without widening the column.
 */
export function LoadoutSummary({ model }: Readonly<{ model: CollectionModel }>) {
  const slots = model.modelDefinition?.attachmentSlots ?? [];
  const items = useMemo(() => loadoutDisplayItems(slots, model, allWargearOptions(model)), [model, slots]);
  const [expanded, setExpanded] = useState(false);
  const [fit, setFit] = useState<LoadoutFit>({ visibleCount: items.length, truncateFirst: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const itemKey = items.map((item) => `${item.key}:${item.wargearLabel ?? ""}`).join("|");

  useLayoutEffect(() => {
    if (expanded || itemKey === "") return;
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const apply = () => {
      const next = readFit(container, measure);
      setFit((current) =>
        current.visibleCount === next.visibleCount && current.truncateFirst === next.truncateFirst ? current : next,
      );
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
  }, [expanded, itemKey]);

  if (slots.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        —
      </Text>
    );
  }

  const visible = expanded ? items : items.slice(0, fit.visibleCount);
  const hiddenCount = items.length - visible.length;

  return (
    <div ref={containerRef} data-loadout-row style={{ position: "relative", width: "100%", minWidth: 0 }}>
      <Group
        gap={4}
        wrap={expanded ? "wrap" : "nowrap"}
        style={{ minWidth: 0, overflow: expanded ? undefined : "hidden" }}
      >
        {visible.map((item, index) => (
          <WargearLoadoutBadge key={item.key} item={item} truncate={!expanded && fit.truncateFirst && index === 0} />
        ))}
        {(hiddenCount > 0 || expanded) && (
          <MoreButton
            expanded={expanded}
            hiddenCount={hiddenCount}
            onClick={() => setExpanded((current) => !current)}
          />
        )}
      </Group>
      <MeasureRow items={items} measureRef={measureRef} />
    </div>
  );
}

function MeasureRow({
  items,
  measureRef,
}: Readonly<{ items: LoadoutDisplayItem[]; measureRef: RefObject<HTMLDivElement | null> }>) {
  return (
    <div aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <Group ref={measureRef} gap={4} wrap="nowrap" style={{ width: "max-content" }}>
        {items.map((item) => (
          <span key={item.key} data-loadout-chip style={{ display: "inline-flex" }}>
            <WargearLoadoutBadge item={item} />
          </span>
        ))}
        <span data-loadout-more style={{ display: "inline-flex" }}>
          <Badge variant="light" color="gray" size="sm">
            +{items.length}
          </Badge>
        </span>
      </Group>
    </div>
  );
}
