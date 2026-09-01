import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import type React from "react";
import { type ReactNode, useEffect, useState } from "react";
import type { WargearDefinition } from "@/generated";

type WargearNameModalProps = Readonly<{
  opened: boolean;
  title: string;
  submitLabel: string;
  /** Context shown above the field, e.g. an admin warning about how many models a rename affects. */
  notice?: ReactNode;
  /** The wargear being renamed, or null when creating a new definition. */
  definition: WargearDefinition | null;
  saving: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}>;

/**
 * The name of a wargear definition, which is the only thing a wargear definition has. Shared by the
 * admin page, where saving stages a rename for review, and a user's own wargear page, where saving
 * applies immediately.
 */
export default function WargearNameModal({
  opened,
  title,
  submitLabel,
  notice,
  definition,
  saving,
  onClose,
  onSave,
}: WargearNameModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(definition?.name ?? "");
  }, [definition]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === definition?.name) return;
    onSave(trimmed);
  }

  const trimmedName = name.trim();
  const isUnchanged = trimmedName === (definition?.name ?? "");

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <Stack>
          {notice}

          {definition?.externalId != null && (
            <Text size="sm" c="dimmed">
              Dataset id{" "}
              <Text span ff="monospace">
                {definition.externalId}
              </Text>{" "}
              is not changed by renaming, so a future import still matches this wargear and will not overwrite your new
              name.
            </Text>
          )}

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
            required
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={trimmedName === "" || isUnchanged}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
