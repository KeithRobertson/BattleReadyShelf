import { Box, Group, Image, ScrollArea, Stack, UnstyledButton } from "@mantine/core";
import { IconMaximize } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import type { CollectionModelImage } from "@/generated";

export type InspectorImageLibraryProps = Readonly<{
  images: CollectionModelImage[];
  alt: string;
}>;

const THUMB_SIZE = 56;

/**
 * One featured photo plus a horizontally scrolling strip of the rest, so extra shots do not
 * push loadout and paints off the aside. The featured shot opens a full-size viewer.
 */
export function InspectorImageLibrary({ images, alt }: InspectorImageLibraryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(images[0]?.id ?? null);
  const [expanded, setExpanded] = useState(false);
  const selected = images.find((image) => image.id === selectedId) ?? images[0];
  const featuredSrc = selected?.largeUrl ?? selected?.thumbnailUrl;

  useEffect(() => {
    if (!images.some((image) => image.id === selectedId)) {
      setSelectedId(images[0]?.id ?? null);
    }
  }, [images, selectedId]);

  if (!selected || !featuredSrc) return null;

  return (
    <Stack gap="xs">
      <UnstyledButton
        onClick={() => setExpanded(true)}
        aria-label={`View ${alt} full size`}
        style={{ display: "block", width: "100%", cursor: "zoom-in" }}
      >
        <Box pos="relative">
          <Image src={featuredSrc} alt={alt} radius="sm" fit="contain" mah={200} w="100%" />
          <Box
            pos="absolute"
            top={6}
            right={6}
            p={4}
            style={{
              pointerEvents: "none",
              borderRadius: "var(--mantine-radius-sm)",
              background: "rgba(0, 0, 0, 0.45)",
              display: "flex",
            }}
          >
            <IconMaximize size={14} color="white" />
          </Box>
        </Box>
      </UnstyledButton>

      {images.length > 1 && (
        <ScrollArea type="hover" offsetScrollbars scrollbarSize={6} scrollbars="x">
          <Group gap={6} wrap="nowrap" pb={4}>
            {images.map((image, index) => {
              const isSelected = image.id === selected.id;
              return (
                <UnstyledButton
                  key={image.id}
                  onClick={() => setSelectedId(image.id ?? null)}
                  aria-label={`Photo ${index + 1} of ${images.length}`}
                  aria-pressed={isSelected}
                  style={{ flexShrink: 0 }}
                >
                  <Image
                    src={image.thumbnailUrl}
                    alt=""
                    radius="sm"
                    w={THUMB_SIZE}
                    h={THUMB_SIZE}
                    fit="cover"
                    style={{
                      outline: isSelected
                        ? "2px solid var(--mantine-color-blue-5)"
                        : "1px solid var(--mantine-color-gray-4)",
                      outlineOffset: 1,
                    }}
                  />
                </UnstyledButton>
              );
            })}
          </Group>
        </ScrollArea>
      )}

      <ResponsiveModal opened={expanded} onClose={() => setExpanded(false)} title={alt} size="xl" centered>
        <Image src={featuredSrc} alt={alt} fit="contain" maw="100%" mah="80vh" />
      </ResponsiveModal>
    </Stack>
  );
}
