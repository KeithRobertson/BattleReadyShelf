const CONCURRENCY = 6;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchAsDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch thumbnail: ${response.status}`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "application/octet-stream";
  const buffer = await response.arrayBuffer();
  return `data:${contentType};base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

/** Fetches thumbnail URLs (concurrency 6) and returns data URIs keyed by original URL. */
export async function inlineThumbnails(
  urls: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ dataUris: Map<string, string>; failed: number }> {
  const dataUris = new Map<string, string>();
  let failed = 0;
  let done = 0;
  const total = urls.length;

  if (total === 0) {
    return { dataUris, failed };
  }

  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      if (url === undefined) break;
      try {
        dataUris.set(url, await fetchAsDataUri(url));
      } catch {
        failed += 1;
      } finally {
        done += 1;
        onProgress?.(done, total);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
  await Promise.all(workers);
  return { dataUris, failed };
}
