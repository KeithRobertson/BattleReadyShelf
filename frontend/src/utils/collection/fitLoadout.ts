export type LoadoutFit = {
  visibleCount: number;
  truncateFirst: boolean;
};

/**
 * How many loadout chips fit on one line, leaving room for a "+n" chip when some are left out.
 * A width of 0 means the line has not been laid out yet, so every chip stays visible.
 */
export function fitLoadout(chipWidths: number[], availableWidth: number, moreWidth: number, gap: number): LoadoutFit {
  if (chipWidths.length === 0 || availableWidth <= 0) {
    return { visibleCount: chipWidths.length, truncateFirst: false };
  }

  let used = 0;
  let visibleCount = 0;
  for (let index = 0; index < chipWidths.length; index += 1) {
    const gapBefore = visibleCount > 0 ? gap : 0;
    const atFullWidth = used + gapBefore + chipWidths[index];
    const hiddenAfter = chipWidths.length - (index + 1);
    const withMore = hiddenAfter > 0 ? atFullWidth + gap + moreWidth : atFullWidth;
    if (withMore > availableWidth) break;
    used = atFullWidth;
    visibleCount = index + 1;
  }

  if (visibleCount === 0) visibleCount = 1;
  const reserve = chipWidths.length > 1 ? gap + moreWidth : 0;
  return {
    visibleCount,
    truncateFirst: visibleCount === 1 && chipWidths[0] + reserve > availableWidth,
  };
}
