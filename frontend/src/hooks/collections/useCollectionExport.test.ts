import { act, renderHook } from "@testing-library/react";
import type { AxiosResponse } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionExportInclude } from "@/generated";
import useCollectionExport from "@/hooks/collections/useCollectionExport";
import { resetApiStubs, stubApi, stubApiWith } from "@/testing/stubApi";
import { ALL_INCLUDED, makeExportDoc } from "@/utils/collectionExport/exportFixture";
import { includeFlagsForRequest } from "@/utils/collectionExport/exportOptions";
import type { TimeDisplay } from "@/utils/collectionExport/formatExportTime";

vi.mock("@/utils/downloadFile", () => ({
  default: vi.fn(),
}));

vi.mock("@/utils/showErrorNotification", () => ({
  default: vi.fn(),
}));

import downloadFile from "@/utils/downloadFile";
import showErrorNotification from "@/utils/showErrorNotification";

const COLLECTION_ID = "11111111-1111-1111-1111-111111111111";

const baseInclude: CollectionExportInclude = {
  ...ALL_INCLUDED,
  statusHistory: false,
  spareBits: false,
};

function exportArgs(
  overrides: Partial<Parameters<ReturnType<typeof useCollectionExport>["exportCollections"]>[0]> & {
    time?: TimeDisplay;
    collectionModelIds?: string[];
  } = {},
) {
  return {
    format: "json" as const,
    detail: "summary" as const,
    include: baseInclude,
    collections: [{ id: COLLECTION_ID, name: "Death Guard" }],
    mode: "download" as const,
    time: { kind: "iso" as const },
    ...overrides,
  };
}

function stubExportSuccess(body: unknown = makeExportDoc()) {
  const captured: unknown[] = [];
  stubApiWith(async (config) => {
    captured.push(typeof config.data === "string" ? JSON.parse(config.data) : config.data);
    const response: AxiosResponse = {
      data: body,
      status: 200,
      statusText: "200",
      headers: {},
      config,
    };
    return response;
  });
  return captured;
}

describe("useCollectionExport", () => {
  beforeEach(() => {
    vi.mocked(downloadFile).mockReset();
    vi.mocked(showErrorNotification).mockReset();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    resetApiStubs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("POSTs a body matching includeFlagsForRequest", async () => {
    const captured = stubExportSuccess();
    const { result } = renderHook(() => useCollectionExport());

    const args = exportArgs({
      format: "markdown",
      detail: "every",
      include: { ...baseInclude, status: true, statusHistory: true, wargear: false, spareBits: true },
    });

    await act(async () => {
      await result.current.exportCollections(args);
    });

    expect(captured).toHaveLength(1);
    expect(captured[0]).toEqual({
      armyCollectionIds: [COLLECTION_ID],
      include: includeFlagsForRequest({
        format: args.format,
        detail: args.detail,
        include: args.include,
      }),
    });
  });

  it("does not download when the export API returns 500", async () => {
    stubApi({ "/army-collections/export": { status: 500, body: { message: "boom" } } });
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await expect(result.current.exportCollections(exportArgs())).rejects.toBeDefined();
    });

    expect(downloadFile).not.toHaveBeenCalled();
  });

  it("notifies and rejects when downloadFile throws", async () => {
    stubExportSuccess();
    vi.mocked(downloadFile).mockImplementation(() => {
      throw new Error("save failed");
    });
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await expect(result.current.exportCollections(exportArgs())).rejects.toThrow("save failed");
    });

    expect(showErrorNotification).toHaveBeenCalledWith("The export file could not be saved.");
  });

  it("notifies and rejects when clipboard write fails", async () => {
    stubExportSuccess();
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error("clipboard denied"));
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await expect(
        result.current.exportCollections(exportArgs({ format: "markdown", mode: "copy" })),
      ).rejects.toThrow("clipboard denied");
    });

    expect(showErrorNotification).toHaveBeenCalledWith(
      "The export could not be copied to the clipboard.",
    );
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it("copies Markdown to the clipboard", async () => {
    stubExportSuccess(makeExportDoc());
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await result.current.exportCollections(exportArgs({ format: "markdown", detail: "summary", mode: "copy" }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
    const written = vi.mocked(navigator.clipboard.writeText).mock.calls[0]?.[0] ?? "";
    expect(written).toContain("#");
    expect(downloadFile).not.toHaveBeenCalled();
  });

  it("updates progress while embedding HTML thumbnails", async () => {
    const doc = makeExportDoc();
    stubExportSuccess(doc);

    let releaseFetch!: () => void;
    const fetchGate = new Promise<void>((resolve) => {
      releaseFetch = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await fetchGate;
        return {
          ok: true,
          headers: { get: () => "image/jpeg" },
          arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
        };
      }),
    );

    const { result } = renderHook(() => useCollectionExport());

    let pending!: Promise<void>;
    await act(async () => {
      pending = result.current.exportCollections(
        exportArgs({
          format: "html",
          detail: "every",
          include: { ...baseInclude, thumbnails: true },
          mode: "download",
        }),
      );
    });

    await vi.waitFor(() => {
      expect(result.current.progress).toEqual({ done: 0, total: 1 });
    });

    await act(async () => {
      releaseFetch();
      await pending;
    });

    expect(result.current.progress).toBeNull();
    expect(downloadFile).toHaveBeenCalledOnce();
    const downloadCall = vi.mocked(downloadFile).mock.calls[0];
    expect(downloadCall).toBeDefined();
    const [contents, fileName, mimeType] = downloadCall ?? [];
    expect(mimeType).toBe("text/html;charset=utf-8");
    expect(fileName).toMatch(/\.html$/);
    expect(contents).toContain("<!DOCTYPE html>");
    expect(contents).toContain("data:image/jpeg;base64,");
  });

  it("formats a markdown download in the chosen zone without sending that zone", async () => {
    const doc = makeExportDoc();
    const miniature = doc.collections[0]?.modelTypes[0]?.miniatures[0];
    if (!miniature) {
      throw new Error("fixture miniature missing");
    }
    miniature.statusChangedAt = "2026-01-15T12:00:00Z";
    miniature.statusHistory = [{ status: "PAINTED", changedAt: "2026-01-15T12:00:00Z" }];

    const captured = stubExportSuccess(doc);
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await result.current.exportCollections(
        exportArgs({
          format: "markdown",
          detail: "every",
          time: { kind: "zone", timeZone: "Europe/London" },
        }),
      );
    });

    expect(captured[0]).toEqual({
      armyCollectionIds: [COLLECTION_ID],
      include: includeFlagsForRequest({
        format: "markdown",
        detail: "every",
        include: baseInclude,
      }),
    });
    expect(JSON.stringify(captured[0])).not.toContain("Europe/London");

    const contents = vi.mocked(downloadFile).mock.calls[0]?.[0] ?? "";
    expect(contents).toContain("15 Jan 2026, 12:00 GMT");
    expect(contents).not.toContain("2026-01-15T12:00:00Z");
  });

  it("keeps raw ISO instants in a JSON download when a zone is chosen", async () => {
    const doc = makeExportDoc();
    stubExportSuccess(doc);
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await result.current.exportCollections(
        exportArgs({
          format: "json",
          time: { kind: "zone", timeZone: "Europe/London" },
        }),
      );
    });

    expect(vi.mocked(downloadFile).mock.calls[0]?.[0]).toBe(JSON.stringify(doc, null, 2));
  });

  it("sends collectionModelIds only when the list is non-empty", async () => {
    const captured = stubExportSuccess();
    const { result } = renderHook(() => useCollectionExport());

    await act(async () => {
      await result.current.exportCollections(exportArgs({ collectionModelIds: ["m1", "m2"] }));
    });

    expect(captured[0]).toMatchObject({ collectionModelIds: ["m1", "m2"] });

    captured.length = 0;
    await act(async () => {
      await result.current.exportCollections(exportArgs({ collectionModelIds: [] }));
    });
    expect(captured[0]).not.toHaveProperty("collectionModelIds");

    captured.length = 0;
    await act(async () => {
      await result.current.exportCollections(exportArgs());
    });
    expect(captured[0]).not.toHaveProperty("collectionModelIds");
  });
});
