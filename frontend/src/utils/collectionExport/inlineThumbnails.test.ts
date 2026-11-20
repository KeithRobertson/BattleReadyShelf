import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineThumbnails } from "@/utils/collectionExport/inlineThumbnails";

function okResponse(bytes: Uint8Array, contentType: string): Response {
  return {
    ok: true,
    headers: { get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as Response;
}

describe("inlineThumbnails", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns data URIs for successes and counts failures", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("fail")) {
        return { ok: false, status: 500 } as Response;
      }
      if (url.includes("a.jpg")) {
        return okResponse(new Uint8Array([1, 2, 3]), "image/jpeg");
      }
      return okResponse(new Uint8Array([4, 5]), "image/png");
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inlineThumbnails([
      "https://cdn.example/a.jpg",
      "https://cdn.example/fail.jpg",
      "https://cdn.example/b.png",
    ]);

    expect(result.failed).toBe(1);
    expect(result.dataUris.size).toBe(2);
    expect(result.dataUris.get("https://cdn.example/a.jpg")).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.dataUris.get("https://cdn.example/b.png")).toMatch(/^data:image\/png;base64,/);
    expect(result.dataUris.has("https://cdn.example/fail.jpg")).toBe(false);
  });

  it("reports progress as each fetch finishes", async () => {
    const fetchMock = vi.fn(async () => okResponse(new Uint8Array([1]), "image/jpeg"));
    vi.stubGlobal("fetch", fetchMock);
    const onProgress = vi.fn();

    await inlineThumbnails(["https://cdn.example/1.jpg", "https://cdn.example/2.jpg"], onProgress);

    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});
