import imageCompression from "browser-image-compression";

const LARGE_MAX_DIMENSION_PX = 1600;
const THUMBNAIL_MAX_DIMENSION_PX = 300;

// WebP gives noticeably smaller files than JPEG at equivalent visual quality, and is supported by
// all browsers we target. We never upload the original, unmodified file -- only these re-encoded
// renditions -- which keeps storage costs down and lets us cap the size of what gets uploaded via
// the compression library's maxSizeMB option.
const VARIANT_OUTPUT_TYPE = "image/webp";

export type ImageVariants = {
  large: Blob;
  thumbnail: Blob;
};

/**
 * Produces the 2 renditions we upload for every collection model image: a large (~1600px)
 * rendition for detail views, and a small (~300px) thumbnail for list/grid views. Both are
 * re-encoded as WebP and given an explicit size budget so real-world photos compress well beyond
 * what resizing alone achieves.
 */
export async function createImageVariants(file: File): Promise<ImageVariants> {
  const [large, thumbnail] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: LARGE_MAX_DIMENSION_PX,
      maxSizeMB: 0.5,
      initialQuality: 0.8,
      fileType: VARIANT_OUTPUT_TYPE,
      useWebWorker: true,
    }),
    imageCompression(file, {
      maxWidthOrHeight: THUMBNAIL_MAX_DIMENSION_PX,
      maxSizeMB: 0.05,
      initialQuality: 0.75,
      fileType: VARIANT_OUTPUT_TYPE,
      useWebWorker: true,
    }),
  ]);

  return { large, thumbnail };
}
