import { ActionIcon, Box, Group, Image, Loader, SimpleGrid, Text } from "@mantine/core";
import { IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import React from "react";
import type { CollectionModelImage } from "@/generated";

export type ModelImageSectionProps = Readonly<{
  images: CollectionModelImage[];
  visibleImages: CollectionModelImage[];
  hiddenImageCount: number;
  imageGridCols: number;
  imageGridSpacing: number;
  imageCellHeight: number;
  displayName?: string;
  editMode: boolean;
  deletingImageId: string | null;
  onDeleteImage: (id: string) => void;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}>;

export const ModelImageSection = React.memo(function ModelImageSection({
  images,
  visibleImages,
  hiddenImageCount,
  imageGridCols,
  imageGridSpacing,
  imageCellHeight,
  displayName,
  editMode,
  deletingImageId,
  onDeleteImage,
  isUploading,
  fileInputRef,
}: ModelImageSectionProps) {
  return (
    <Box w={100} style={{ flexShrink: 0, position: "relative" }}>
      {images.length > 0 ? (
        <SimpleGrid cols={imageGridCols} spacing={imageGridSpacing}>
          {visibleImages.map((img, index) => {
            const isLastVisible = index === visibleImages.length - 1;

            return (
              <Box key={img.id} pos="relative">
                <Image
                  src={img.thumbnailUrl}
                  alt={displayName || "Model image"}
                  radius="sm"
                  h={imageCellHeight}
                  w="100%"
                  fit="cover"
                />

                {isLastVisible && hiddenImageCount > 0 && (
                  <Box
                    pos="absolute"
                    inset={0}
                    bg="rgba(0, 0, 0, 0.55)"
                    style={{
                      borderRadius: "var(--mantine-radius-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text size="xs" fw={700} c="white">
                      +{hiddenImageCount}
                    </Text>
                  </Box>
                )}

                {img.id && editMode && !(isLastVisible && hiddenImageCount > 0) && (
                  <ActionIcon
                    size="sm"
                    variant="filled"
                    color="red"
                    radius="xl"
                    title="Delete image"
                    onClick={() => img.id && onDeleteImage(img.id)}
                    disabled={deletingImageId === img.id}
                    style={{ position: "absolute", top: -6, right: -6 }}
                  >
                    {deletingImageId === img.id ? <Loader size={10} color="white" /> : <IconTrash size={10} />}
                  </ActionIcon>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      ) : (
        <Group
          justify="center"
          align="center"
          h={100}
          onClick={() => editMode && !isUploading && fileInputRef.current?.click()}
          style={{
            border: "1px dashed var(--mantine-color-gray-4)",
            borderRadius: "var(--mantine-radius-sm)",
            cursor: editMode && !isUploading ? "pointer" : "default",
          }}
        >
          {isUploading ? <Loader size={20} /> : <IconPhoto size={20} color="var(--mantine-color-gray-5)" />}
        </Group>
      )}

      {editMode && (
        <ActionIcon
          size="sm"
          variant="filled"
          title="Upload image"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ position: "absolute", bottom: -6, right: -6 }}
        >
          {isUploading ? <Loader size={10} color="white" /> : <IconUpload size={12} stroke={1.5} />}
        </ActionIcon>
      )}
    </Box>
  );
});
