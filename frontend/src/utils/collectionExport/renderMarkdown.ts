import type {
  CollectionExport,
  CollectionExportCollection,
  CollectionExportMiniature,
  CollectionExportModelType,
  CollectionExportPaintRecipe,
} from "@/generated";
import { escapeMarkdownInline } from "@/utils/collectionExport/escape";
import type { ExportDetail } from "@/utils/collectionExport/exportOptions";
import { type TimeDisplay, formatExportTime } from "@/utils/collectionExport/formatExportTime";
import {
  footerLine,
  formatLoadoutGroupLine,
  formatLoadoutItems,
  formatPaintLine,
  formatStatusCounts,
  formatStatusLabel,
  isIncluded,
  miniaturePositionLabel,
  paintRecipeHasContent,
} from "@/utils/collectionExport/renderShared";
import { summariseModelType } from "@/utils/collectionExport/summariseModelType";

function renderPaintRecipe(recipe: CollectionExportPaintRecipe): string[] {
  const lines: string[] = ["## Paint recipe", ""];
  if (recipe.notes) {
    lines.push(escapeMarkdownInline(recipe.notes), "");
  }
  for (const paint of recipe.paints) {
    lines.push(`- ${escapeMarkdownInline(formatPaintLine(paint))}`);
  }
  if (recipe.paints.length > 0) {
    lines.push("");
  }
  return lines;
}

function modelTypeHeading(type: CollectionExportModelType, showFaction: boolean): string {
  const faction =
    showFaction && type.faction ? ` (${escapeMarkdownInline(type.faction)})` : "";
  return `## ${escapeMarkdownInline(type.name)}${faction} — ${type.modelCount}`;
}

function miniatureHeading(miniature: CollectionExportMiniature, index: number, showDetails: boolean): string {
  const raw =
    showDetails && miniature.name?.trim() ? miniature.name.trim() : miniaturePositionLabel(index);
  return `### ${escapeMarkdownInline(raw)}`;
}

function markdownTime(iso: string | null | undefined, time: TimeDisplay): string | null {
  if (!iso) {
    return null;
  }
  const formatted = formatExportTime(iso, time);
  return formatted === null ? null : escapeMarkdownInline(formatted);
}

function appendMiniatureStatus(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
  time: TimeDisplay,
): void {
  if (!isIncluded(included, "status") || !miniature.status) {
    return;
  }
  const formatted = markdownTime(miniature.statusChangedAt, time);
  const when = formatted !== null ? ` (${formatted})` : "";
  lines.push(`- Status: ${escapeMarkdownInline(formatStatusLabel(miniature.status))}${when}`);
}

function appendMiniatureStatusHistory(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
  time: TimeDisplay,
): void {
  if (!isIncluded(included, "statusHistory") || !miniature.statusHistory?.length) {
    return;
  }
  lines.push("- Status history:");
  for (const event of miniature.statusHistory) {
    const formatted = markdownTime(event.changedAt, time);
    const when = formatted !== null ? ` · ${formatted}` : "";
    lines.push(`  - ${escapeMarkdownInline(formatStatusLabel(event.status))}${when}`);
  }
}

function appendMiniatureLoadout(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): void {
  if (!isIncluded(included, "wargear") || !miniature.loadout?.length) {
    return;
  }
  const items = formatLoadoutItems(miniature.loadout);
  if (items) {
    lines.push(`- Loadout: ${escapeMarkdownInline(items)}`);
  }
}

function appendMiniaturePaintRecipe(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): void {
  if (!isIncluded(included, "paintRecipes") || !paintRecipeHasContent(miniature.paintRecipe)) {
    return;
  }
  const recipe = miniature.paintRecipe;
  lines.push("- Paint recipe:");
  if (recipe.notes) {
    lines.push(`  - ${escapeMarkdownInline(recipe.notes)}`);
  }
  for (const paint of recipe.paints) {
    lines.push(`  - ${escapeMarkdownInline(formatPaintLine(paint))}`);
  }
}

function renderMiniature(
  miniature: CollectionExportMiniature,
  index: number,
  included: CollectionExport["included"],
  time: TimeDisplay,
): string[] {
  const lines: string[] = [
    miniatureHeading(miniature, index, isIncluded(included, "miniatureDetails")),
    "",
  ];

  if (isIncluded(included, "miniatureDetails") && miniature.description?.trim()) {
    lines.push(escapeMarkdownInline(miniature.description.trim()), "");
  }

  appendMiniatureStatus(lines, miniature, included, time);
  appendMiniatureStatusHistory(lines, miniature, included, time);
  appendMiniatureLoadout(lines, miniature, included);
  appendMiniaturePaintRecipe(lines, miniature, included);

  lines.push("");
  return lines;
}

function renderModelTypeSummary(
  type: CollectionExportModelType,
  included: CollectionExport["included"],
): string[] {
  const lines: string[] = [modelTypeHeading(type, isIncluded(included, "faction")), ""];

  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(type.statusCounts);
    if (counts) {
      lines.push(`- ${counts}`);
    }
  }

  if (isIncluded(included, "wargear")) {
    const { loadoutGroups } = summariseModelType(type);
    for (const group of loadoutGroups) {
      lines.push(`- ${escapeMarkdownInline(formatLoadoutGroupLine(group.count, group.loadout))}`);
    }
  }

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(type.paintRecipe)) {
    lines.push(...renderPaintRecipe(type.paintRecipe));
  }

  lines.push("");
  return lines;
}

function renderModelTypeEvery(
  type: CollectionExportModelType,
  included: CollectionExport["included"],
  time: TimeDisplay,
): string[] {
  const lines: string[] = [modelTypeHeading(type, isIncluded(included, "faction")), ""];

  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(type.statusCounts);
    if (counts) {
      lines.push(`- ${counts}`, "");
    }
  }

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(type.paintRecipe)) {
    lines.push(...renderPaintRecipe(type.paintRecipe));
  }

  type.miniatures.forEach((miniature, index) => {
    lines.push(...renderMiniature(miniature, index, included, time));
  });

  return lines;
}

function renderCollection(
  collection: CollectionExportCollection,
  detail: ExportDetail,
  included: CollectionExport["included"],
  time: TimeDisplay,
): string[] {
  const lines: string[] = [`# ${escapeMarkdownInline(collection.name)}`, ""];

  if (isIncluded(included, "collectionDescription") && collection.description?.trim()) {
    lines.push(escapeMarkdownInline(collection.description.trim()), "");
  }

  lines.push(`- ${collection.modelCount} models`);

  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(collection.statusCounts);
    if (counts) {
      lines.push(`- ${counts}`);
    }
  }

  lines.push("");

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(collection.paintRecipe)) {
    lines.push(...renderPaintRecipe(collection.paintRecipe));
  }

  for (const type of collection.modelTypes) {
    if (detail === "summary") {
      lines.push(...renderModelTypeSummary(type, included));
    } else {
      lines.push(...renderModelTypeEvery(type, included, time));
    }
  }

  return lines;
}

export function renderMarkdown(doc: CollectionExport, detail: ExportDetail, time: TimeDisplay): string {
  const lines: string[] = [];

  for (const collection of doc.collections) {
    lines.push(...renderCollection(collection, detail, doc.included, time));
  }

  lines.push("---", "", footerLine(doc.exportedAt), "");
  return lines.join("\n");
}
