import type {
  CollectionExport,
  CollectionExportCollection,
  CollectionExportMiniature,
  CollectionExportModelType,
  CollectionExportPaint,
  CollectionExportPaintRecipe,
} from "@/generated";
import { escapeHtml } from "@/utils/collectionExport/escape";
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
  isValidHexColour,
  miniaturePositionLabel,
  paintRecipeHasContent,
} from "@/utils/collectionExport/renderShared";
import { summariseModelType } from "@/utils/collectionExport/summariseModelType";

const PRINT_CSS = `
:root { color-scheme: light; }
body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 14px;
  line-height: 1.45;
  color: #1a1a1a;
  background: #fff;
  max-width: 52rem;
  margin: 0 auto;
  padding: 1.5rem;
}
h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
h2 { font-size: 1.25rem; margin: 1.5rem 0 0.5rem; border-bottom: 1px solid #ddd; padding-bottom: 0.2rem; }
h3 { font-size: 1.05rem; margin: 1rem 0 0.35rem; }
p, ul { margin: 0.35rem 0; }
ul { padding-left: 1.25rem; }
.meta { color: #444; }
.swatch {
  display: inline-block;
  width: 0.85em;
  height: 0.85em;
  border: 1px solid #888;
  border-radius: 2px;
  vertical-align: -0.1em;
  margin-right: 0.35em;
}
.miniature {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin: 0.75rem 0;
}
.miniature img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid #ccc;
  flex-shrink: 0;
}
.miniature-body { flex: 1; min-width: 0; }
.footer {
  margin-top: 2rem;
  padding-top: 0.75rem;
  border-top: 1px solid #ddd;
  color: #555;
  font-size: 0.9rem;
}
`.trim();

function paintItem(paint: CollectionExportPaint): string {
  const swatch = isValidHexColour(paint.hexColour)
    ? `<span class="swatch" style="background-color:${paint.hexColour}"></span>`
    : "";
  return `<li>${swatch}${escapeHtml(formatPaintLine(paint))}</li>`;
}

function renderPaintRecipe(recipe: CollectionExportPaintRecipe): string {
  const parts: string[] = [`<h2>Paint recipe</h2>`];
  if (recipe.notes) {
    parts.push(`<p>${escapeHtml(recipe.notes)}</p>`);
  }
  if (recipe.paints.length > 0) {
    parts.push(`<ul>${recipe.paints.map(paintItem).join("")}</ul>`);
  }
  return parts.join("");
}

function modelTypeHeading(type: CollectionExportModelType, showFaction: boolean): string {
  const faction = showFaction && type.faction ? ` (${escapeHtml(type.faction)})` : "";
  return `<h2>${escapeHtml(type.name)}${faction} — ${type.modelCount}</h2>`;
}

function miniatureTitle(miniature: CollectionExportMiniature, index: number, showDetails: boolean): string {
  const raw =
    showDetails && miniature.name?.trim() ? miniature.name.trim() : miniaturePositionLabel(index);
  return escapeHtml(raw);
}

function miniatureThumbnailHtml(
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
  thumbnails: ReadonlyMap<string, string>,
): string {
  if (!isIncluded(included, "thumbnails") || !miniature.thumbnailUrl) {
    return "";
  }
  const dataUri = thumbnails.get(miniature.thumbnailUrl);
  return dataUri ? `<img src="${escapeHtml(dataUri)}" alt="" />` : "";
}

function htmlTime(iso: string | null | undefined, time: TimeDisplay): string | null {
  if (!iso) {
    return null;
  }
  const formatted = formatExportTime(iso, time);
  return formatted === null ? null : escapeHtml(formatted);
}

function miniatureStatusBullet(
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
  time: TimeDisplay,
): string | null {
  if (!isIncluded(included, "status") || !miniature.status) {
    return null;
  }
  const formatted = htmlTime(miniature.statusChangedAt, time);
  const when = formatted !== null ? ` (${formatted})` : "";
  return `<li>Status: ${escapeHtml(formatStatusLabel(miniature.status))}${when}</li>`;
}

function miniatureStatusHistoryBullet(
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
  time: TimeDisplay,
): string | null {
  if (!isIncluded(included, "statusHistory") || !miniature.statusHistory?.length) {
    return null;
  }
  const events = miniature.statusHistory
    .map((event) => {
      const formatted = htmlTime(event.changedAt, time);
      const when = formatted !== null ? ` · ${formatted}` : "";
      return `<li>${escapeHtml(formatStatusLabel(event.status))}${when}</li>`;
    })
    .join("");
  return `<li>Status history:<ul>${events}</ul></li>`;
}

function miniatureLoadoutBullet(
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): string | null {
  if (!isIncluded(included, "wargear") || !miniature.loadout?.length) {
    return null;
  }
  const items = formatLoadoutItems(miniature.loadout);
  return items ? `<li>Loadout: ${escapeHtml(items)}</li>` : null;
}

function miniaturePaintRecipeBullet(
  miniature: CollectionExportMiniature,
  included: CollectionExport["included"],
): string | null {
  if (!isIncluded(included, "paintRecipes") || !paintRecipeHasContent(miniature.paintRecipe)) {
    return null;
  }
  const recipe = miniature.paintRecipe;
  const recipeBits: string[] = [];
  if (recipe.notes) {
    recipeBits.push(`<li>${escapeHtml(recipe.notes)}</li>`);
  }
  for (const paint of recipe.paints) {
    recipeBits.push(paintItem(paint));
  }
  return `<li>Paint recipe:<ul>${recipeBits.join("")}</ul></li>`;
}

function renderMiniature(
  miniature: CollectionExportMiniature,
  index: number,
  included: CollectionExport["included"],
  thumbnails: ReadonlyMap<string, string>,
  time: TimeDisplay,
): string {
  const showDetails = isIncluded(included, "miniatureDetails");
  const title = miniatureTitle(miniature, index, showDetails);
  const img = miniatureThumbnailHtml(miniature, included, thumbnails);
  const body: string[] = [`<h3>${title}</h3>`];

  if (showDetails && miniature.description?.trim()) {
    body.push(`<p>${escapeHtml(miniature.description.trim())}</p>`);
  }

  const bullets = [
    miniatureStatusBullet(miniature, included, time),
    miniatureStatusHistoryBullet(miniature, included, time),
    miniatureLoadoutBullet(miniature, included),
    miniaturePaintRecipeBullet(miniature, included),
  ].filter((bullet): bullet is string => bullet !== null);

  if (bullets.length > 0) {
    body.push(`<ul>${bullets.join("")}</ul>`);
  }

  return `<div class="miniature">${img}<div class="miniature-body">${body.join("")}</div></div>`;
}

function renderModelTypeSummary(
  type: CollectionExportModelType,
  included: CollectionExport["included"],
): string {
  const parts: string[] = [modelTypeHeading(type, isIncluded(included, "faction"))];
  const bullets: string[] = [];

  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(type.statusCounts);
    if (counts) {
      bullets.push(`<li>${escapeHtml(counts)}</li>`);
    }
  }

  if (isIncluded(included, "wargear")) {
    for (const group of summariseModelType(type).loadoutGroups) {
      bullets.push(`<li>${escapeHtml(formatLoadoutGroupLine(group.count, group.loadout))}</li>`);
    }
  }

  if (bullets.length > 0) {
    parts.push(`<ul>${bullets.join("")}</ul>`);
  }

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(type.paintRecipe)) {
    parts.push(renderPaintRecipe(type.paintRecipe));
  }

  return parts.join("");
}

function renderModelTypeEvery(
  type: CollectionExportModelType,
  included: CollectionExport["included"],
  thumbnails: ReadonlyMap<string, string>,
  time: TimeDisplay,
): string {
  const parts: string[] = [modelTypeHeading(type, isIncluded(included, "faction"))];

  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(type.statusCounts);
    if (counts) {
      parts.push(`<ul class="meta"><li>${escapeHtml(counts)}</li></ul>`);
    }
  }

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(type.paintRecipe)) {
    parts.push(renderPaintRecipe(type.paintRecipe));
  }

  type.miniatures.forEach((miniature, index) => {
    parts.push(renderMiniature(miniature, index, included, thumbnails, time));
  });

  return parts.join("");
}

function renderCollection(
  collection: CollectionExportCollection,
  detail: ExportDetail,
  included: CollectionExport["included"],
  thumbnails: ReadonlyMap<string, string>,
  time: TimeDisplay,
): string {
  const parts: string[] = [`<h1>${escapeHtml(collection.name)}</h1>`];

  if (isIncluded(included, "collectionDescription") && collection.description?.trim()) {
    parts.push(`<p>${escapeHtml(collection.description.trim())}</p>`);
  }

  const meta: string[] = [`<li>${collection.modelCount} models</li>`];
  if (isIncluded(included, "status")) {
    const counts = formatStatusCounts(collection.statusCounts);
    if (counts) {
      meta.push(`<li>${escapeHtml(counts)}</li>`);
    }
  }
  parts.push(`<ul class="meta">${meta.join("")}</ul>`);

  if (isIncluded(included, "paintRecipes") && paintRecipeHasContent(collection.paintRecipe)) {
    parts.push(renderPaintRecipe(collection.paintRecipe));
  }

  for (const type of collection.modelTypes) {
    if (detail === "summary") {
      parts.push(renderModelTypeSummary(type, included));
    } else {
      parts.push(renderModelTypeEvery(type, included, thumbnails, time));
    }
  }

  return `<section>${parts.join("")}</section>`;
}

export function renderHtml(
  doc: CollectionExport,
  detail: ExportDetail,
  thumbnails: ReadonlyMap<string, string>,
  time: TimeDisplay,
): string {
  const body = doc.collections
    .map((collection) => renderCollection(collection, detail, doc.included, thumbnails, time))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Collection export</title>
<style>
${PRINT_CSS}
</style>
</head>
<body>
${body}
<p class="footer">${escapeHtml(footerLine(doc.exportedAt))}</p>
</body>
</html>
`;
}
