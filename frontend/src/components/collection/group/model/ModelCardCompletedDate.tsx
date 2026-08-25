import { ActionIcon, Group, Loader, Text } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconCalendar, IconCheck, IconPencil, IconX } from "@tabler/icons-react";
import React from "react";
import type { CollectionModel } from "@/generated";

type ModelCardCompletedDateProps = {
  model: CollectionModel;
  finishedOnDraft: string | null;
  isEditingFinishedOn: boolean;
  isUpdatingFinishedOn: boolean;
  startEditingFinishedOn: () => void;
  commitEditingFinishedOn: () => void;
  setFinishedOnDraft: (finishedOnDraft: string | null) => void;
  setIsEditingFinishedOn: (isEditingFinishedOn: boolean) => void;
  editMode: boolean;
};

export const ModelCardCompletedDate = React.memo(function ModelCardCompletedDate({
  model,
  finishedOnDraft,
  isEditingFinishedOn,
  isUpdatingFinishedOn,
  startEditingFinishedOn,
  commitEditingFinishedOn,
  setFinishedOnDraft,
  setIsEditingFinishedOn,
  editMode,
}: ModelCardCompletedDateProps) {
  return isEditingFinishedOn ? (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      <DateInput
        size="xs"
        autoFocus
        value={finishedOnDraft}
        onChange={(value) => setFinishedOnDraft(value)}
        valueFormat="DD MMM YYYY"
        placeholder="Finished on"
        clearable
        leftSection={<IconCalendar size={14} />}
        disabled={isUpdatingFinishedOn}
        style={{ flex: 1, maxWidth: 160 }}
      />
      <ActionIcon size="sm" variant="subtle" onClick={commitEditingFinishedOn} disabled={isUpdatingFinishedOn}>
        {isUpdatingFinishedOn ? <Loader size={12} /> : <IconCheck size={14} />}
      </ActionIcon>
      <ActionIcon
        size="sm"
        variant="subtle"
        onClick={() => setIsEditingFinishedOn(false)}
        disabled={isUpdatingFinishedOn}
      >
        <IconX size={14} />
      </ActionIcon>
    </Group>
  ) : (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
      <Text size="xs" c="dimmed">
        {model.finishedOn ? `Finished ${model.finishedOn}` : "Not finished"}
      </Text>
      {editMode && (
        <ActionIcon size="sm" variant="subtle" title="Set finished date" onClick={startEditingFinishedOn}>
          <IconPencil size={12} />
        </ActionIcon>
      )}
    </Group>
  );
});
