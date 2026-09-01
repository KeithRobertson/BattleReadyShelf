import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { WargearDefinition } from "@/generated";

type RenameWargearDefinitionModalProps = Readonly<{
  definition: WargearDefinition | null;
  saving: boolean;
  onClose: () => void;
  onSave: (definition: WargearDefinition, name: string) => void;
}>;

function usageWarning(usageCount: number) {
  if (usageCount === 0) {
    return "No model definitions use this wargear yet.";
  }
  if (usageCount === 1) {
    return "1 model definition uses this wargear and will show the new name once the change is accepted.";
  }
  return `${usageCount} model definitions use this wargear and will all show the new name once the change is accepted.`;
}

/**
 * Proposes a new name for a shared wargear definition. The name lives in one place, so this is the
 * only way to change how a piece of wargear reads - editing a single model definition cannot do it.
 * For that same reason the change is staged for review rather than applied on save.
 */
export default function RenameWargearDefinitionModal({
  definition,
  saving,
  onClose,
  onSave,
}: RenameWargearDefinitionModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    setName(definition?.name ?? "");
  }, [definition]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!definition) return;
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === definition.name) return;
    onSave(definition, trimmed);
  }

  const trimmedName = name.trim();
  const isUnchanged = trimmedName === (definition?.name ?? "");

  return (
    <Modal opened={definition !== null} onClose={onClose} title="Propose a wargear rename">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {usageWarning(definition?.usageCount ?? 0)}
          </Alert>

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
              Propose change
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
