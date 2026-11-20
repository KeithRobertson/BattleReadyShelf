import type {
  CollectionExport,
  CollectionExportCollection,
  CollectionExportMiniature,
  CollectionExportModelType,
  CollectionExportPaintRecipe,
} from "@/generated";
import { escapeMarkdownInline } from "@/utils/collectionExport/escape";
import type { ExportDetail } from "@/utils/collectionExport/exportOptions";
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

function appendMiniatureStatus(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): void {
  if (!isIncluded(included, "status") || !miniature.status) {
    return;
  }
  const when = miniature.statusChangedAt ? ` (${miniature.statusChangedAt})` : "";
  lines.push(`- Status: ${escapeMarkdownInline(formatStatusLabel(miniature.status))}${when}`);
}

function appendMiniatureStatusHistory(
  lines: string[],
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): void {
  if (!isIncluded(included, "statusHistory") || !miniature.statusHistory?.length) {
    return;
  }
  lines.push("- Status history:");
  for (const event of miniature.statusHistory) {
    lines.push(`  - ${escapeMarkdownInline(formatStatusLabel(event.status))} · ${event.changedAt}`);
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
): string[] {
  const lines: string[] = [
    miniatureHeading(miniature, index, isIncluded(included, "miniatureDetails")),
    "",
  ];

  if (isIncluded(included, "miniatureDetails") && miniature.description?.trim()) {
    lines.push(escapeMarkdownInline(miniature.description.trim()), "");
  }

  appendMiniatureStatus(lines, miniature, included);
  appendMiniatureStatusHistory(lines, miniature, included);
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
    lines.push(...renderMiniature(miniature, index, included));
  });

  return lines;
}

function renderCollection(
  collection: CollectionExportCollection,
  detail: ExportDetail,
  included: CollectionExport["included"],
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
      lines.push(...renderModelTypeEvery(type, included));
    }
  }

  return lines;
}

export function renderMarkdown(doc: CollectionExport, detail: ExportDetail): string {
  const lines: string[] = [];

  for (const collection of doc.collections) {
    lines.push(...renderCollection(collection, detail, doc.included));
  }

  lines.push("---", "", footerLine(doc.exportedAt), "");
  return lines.join("\n");
}
