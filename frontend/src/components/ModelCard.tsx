import { ActionIcon, Badge, Card, Group, Image, Loader, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconTrash, IconUpload } from "@tabler/icons-react";
import { useRef } from "react";
import type { CollectionModel } from "../generated";

type ModelCardProps = {
  model: CollectionModel;
  onUploadImage: (file: File) => void;
  onDeleteImage: (imageId: string) => void;
  isUploading: boolean;
  deletingImageId: string | null;
};

export default function ModelCard({
  model,
  onUploadImage,
  onDeleteImage,
  isUploading,
  deletingImageId,
}: ModelCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const images = model.images ?? [];
  const displayName = model.name?.trim();

  return (
    <Card withBorder radius="md" padding="md">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap="xs" wrap="nowrap">
            <Badge variant="light">{model.modelDefinition?.name ?? "Unknown type"}</Badge>
            <Text fw={500} fs={displayName ? undefined : "italic"} c={displayName ? undefined : "dimmed"}>
              {displayName || "Unnamed"}
            </Text>
          </Group>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/heic"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadImage(file);
              e.target.value = "";
            }}
          />
          <ActionIcon
            variant="subtle"
            title="Upload image"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader size={16} /> : <IconUpload size={16} stroke={1.5} />}
          </ActionIcon>
        </Group>

        {model.description && (
          <Text size="sm" c="dimmed">
            {model.description}
          </Text>
        )}

        {images.length > 0 && (
          <SimpleGrid cols={{ base: 3, xs: 4 }} spacing="xs">
            {images.map((img) => (
              <div key={img.id} style={{ position: "relative" }}>
                <Image src={img.url} alt={displayName || "Model image"} radius="sm" h={80} fit="cover" />
                {img.id && (
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
                    {deletingImageId === img.id ? <Loader size={12} color="white" /> : <IconTrash size={12} />}
                  </ActionIcon>
                )}
              </div>
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Card>
  );
}
