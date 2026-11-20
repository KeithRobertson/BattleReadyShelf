import type { CollectionExportInclude } from "@/generated";

export type ExportFormat = "json" | "html" | "markdown";
export type ExportDetail = "summary" | "every";

export type ExportIncludeFlag = keyof CollectionExportInclude;

export type ExportOptionsUiState = {
  format: ExportFormat;
  detail: ExportDetail;
  include: CollectionExportInclude;
};

/** Whether a checkbox is meaningful for the current format and detail level (not parent-flag deps). */
export function optionApplies(flag: ExportIncludeFlag, format: ExportFormat, detail: ExportDetail): boolean {
  switch (flag) {
    case "thumbnails":
      return format === "html" && detail === "every";
    case "statusHistory":
    case "miniatureDetails":
      return format === "json" || detail === "every";
    default:
      return true;
  }
}

/** Normalises checkbox state into the include flags sent on the export request. */
export function includeFlagsForRequest(uiState: ExportOptionsUiState): CollectionExportInclude {
  const { format, detail, include } = uiState;
  const status = !!include.status;
  const wargear = !!include.wargear;

  return {
    collectionDescription: !!include.collectionDescription && optionApplies("collectionDescription", format, detail),
    faction: !!include.faction && optionApplies("faction", format, detail),
    status,
    statusHistory: !!include.statusHistory && status && optionApplies("statusHistory", format, detail),
    wargear,
    spareBits: !!include.spareBits && wargear && optionApplies("spareBits", format, detail),
    paintRecipes: !!include.paintRecipes && optionApplies("paintRecipes", format, detail),
    miniatureDetails: !!include.miniatureDetails && optionApplies("miniatureDetails", format, detail),
    thumbnails: !!include.thumbnails && optionApplies("thumbnails", format, detail),
  };
}
