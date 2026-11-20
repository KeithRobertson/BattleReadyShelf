import type { ExportFormat } from "@/utils/collectionExport/exportOptions";

const EXTENSION: Record<ExportFormat, string> = {
  json: "json",
  html: "html",
  markdown: "md",
};

function slugify(name: string | undefined): string {
  const slug = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "collection";
}

/** Builds a download file name for one or more collections. Date is UTC YYYY-MM-DD. */
export function exportFileName(
  collections: { name?: string }[],
  format: ExportFormat,
  date: Date = new Date(),
): string {
  const prefix =
    collections.length === 1 ? slugify(collections[0]?.name) : "collections";
  const day = date.toISOString().slice(0, 10);
  return `${prefix}-${day}.${EXTENSION[format]}`;
}
