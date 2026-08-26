import { ActionIcon, Group, Loader, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import React from "react";

export type ModelCardDescriptionProps = Readonly<{
  description: string | undefined;
  descriptionDraft: string;
  isEditingDescription: boolean;
  isUpdatingDescription: boolean;
  startEditingDescription: () => void;
  commitEditingDescription: () => void;
  setDescriptionDraft: (description: string) => void;
  setIsEditingDescription: (isEditingDescription: boolean) => void;
  editMode: boolean;
}>;

export const ModelCardDescription = React.memo(function ModelCardDescription({
  description,
  descriptionDraft,
  isEditingDescription,
  isUpdatingDescription,
  startEditingDescription,
  commitEditingDescription,
  setDescriptionDraft,
  setIsEditingDescription,
  editMode,
}: ModelCardDescriptionProps) {
  return isEditingDescription ? (
    <Stack gap={4} style={{ width: "100%" }}>
      <Textarea
        size="xs"
        autoFocus
        autosize
        minRows={2}
        maxRows={4}
        value={descriptionDraft}
        onChange={(e) => setDescriptionDraft(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsEditingDescription(false);
        }}
        disabled={isUpdatingDescription}
        placeholder="Description"
      />
      <Group gap={4} justify="flex-end">
        <ActionIcon size="sm" variant="subtle" onClick={commitEditingDescription} disabled={isUpdatingDescription}>
          {isUpdatingDescription ? <Loader size={12} /> : <IconCheck size={14} />}
        </ActionIcon>
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={() => setIsEditingDescription(false)}
          disabled={isUpdatingDescription}
        >
          <IconX size={14} />
        </ActionIcon>
      </Group>
    </Stack>
  ) : (
    <Group gap={4} wrap="nowrap" justify="flex-end" style={{ width: "100%" }}>
      <Tooltip label={description} disabled={!description} multiline maw={280} withArrow>
        <Text
          size="sm"
          c="dimmed"
          ta="right"
          fs={description ? undefined : "italic"}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {description || "No description"}
        </Text>
      </Tooltip>
      {editMode && (
        <ActionIcon size="sm" variant="subtle" title="Edit description" onClick={startEditingDescription}>
          <IconPencil size={12} />
        </ActionIcon>
      )}
    </Group>
  );
});
