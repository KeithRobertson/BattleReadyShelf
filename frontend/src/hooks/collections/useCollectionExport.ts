import { isAxiosError } from "axios";
import { useState } from "react";
import {
  type CollectionExport,
  type CollectionExportInclude,
  type CollectionExportRequest,
  exportArmyCollections,
} from "@/generated";
import { exportFileName } from "@/utils/collectionExport/exportFileName";
import { type ExportDetail, type ExportFormat, includeFlagsForRequest } from "@/utils/collectionExport/exportOptions";
import type { TimeDisplay } from "@/utils/collectionExport/formatExportTime";
import { inlineThumbnails } from "@/utils/collectionExport/inlineThumbnails";
import { renderHtml } from "@/utils/collectionExport/renderHtml";
import { renderMarkdown } from "@/utils/collectionExport/renderMarkdown";
import downloadFile from "@/utils/downloadFile";
import showErrorNotification from "@/utils/showErrorNotification";

export type CollectionExportProgress = { done: number; total: number } | null;

export type ExportCollectionsArgs = {
  format: ExportFormat;
  detail: ExportDetail;
  include: CollectionExportInclude;
  collections: { id: string; name?: string }[];
  mode: "download" | "copy";
  time: TimeDisplay;
  collectionModelIds?: string[];
};

const MIME: Record<ExportFormat, string> = {
  json: "application/json",
  html: "text/html;charset=utf-8",
  markdown: "text/markdown;charset=utf-8",
};

function collectThumbnailUrls(doc: CollectionExport): string[] {
  const urls = new Set<string>();
  for (const collection of doc.collections) {
    for (const type of collection.modelTypes) {
      for (const miniature of type.miniatures) {
        if (miniature.thumbnailUrl) {
          urls.add(miniature.thumbnailUrl);
        }
      }
    }
  }
  return [...urls];
}

function thumbnailFailureMessage(failed: number, total: number): string {
  if (failed >= total) {
    return "The export contains no photos.";
  }
  return `${failed} of ${total} photos could not be embedded.`;
}

async function buildContents(
  doc: CollectionExport,
  format: ExportFormat,
  detail: ExportDetail,
  include: CollectionExportInclude,
  time: TimeDisplay,
  onThumbnailProgress: (done: number, total: number) => void,
): Promise<string> {
  if (format === "json") {
    return JSON.stringify(doc, null, 2);
  }

  if (format === "markdown") {
    return renderMarkdown(doc, detail, time);
  }

  let thumbnails: ReadonlyMap<string, string> = new Map();
  if (include.thumbnails) {
    const urls = collectThumbnailUrls(doc);
    if (urls.length > 0) {
      onThumbnailProgress(0, urls.length);
      const result = await inlineThumbnails(urls, onThumbnailProgress);
      thumbnails = result.dataUris;
      if (result.failed > 0) {
        showErrorNotification(thumbnailFailureMessage(result.failed, urls.length));
      }
    }
  }

  return renderHtml(doc, detail, thumbnails, time);
}

function exportRequestBody(args: ExportCollectionsArgs, include: CollectionExportInclude): CollectionExportRequest {
  const body: CollectionExportRequest = {
    armyCollectionIds: args.collections.map((collection) => collection.id),
    include,
  };
  if (args.collectionModelIds && args.collectionModelIds.length > 0) {
    body.collectionModelIds = args.collectionModelIds;
  }
  return body;
}

export default function useCollectionExport(): {
  exporting: boolean;
  progress: CollectionExportProgress;
  exportCollections: (args: ExportCollectionsArgs) => Promise<void>;
} {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<CollectionExportProgress>(null);

  async function exportCollections(args: ExportCollectionsArgs): Promise<void> {
    const include = includeFlagsForRequest({
      format: args.format,
      detail: args.detail,
      include: args.include,
    });

    setExporting(true);
    setProgress(null);
    try {
      const { data } = await exportArmyCollections({
        body: exportRequestBody(args, include),
        throwOnError: true,
      });

      const contents = await buildContents(data, args.format, args.detail, include, args.time, (done, total) => {
        setProgress({ done, total });
      });

      if (args.mode === "copy") {
        try {
          await navigator.clipboard.writeText(contents);
        } catch (e) {
          if (!isAxiosError(e)) {
            showErrorNotification("The export could not be copied to the clipboard.");
          }
          throw e;
        }
        return;
      }

      try {
        downloadFile(contents, exportFileName(args.collections, args.format), MIME[args.format]);
      } catch (e) {
        if (!isAxiosError(e)) {
          showErrorNotification("The export file could not be saved.");
        }
        throw e;
      }
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }

  return { exporting, progress, exportCollections };
}
