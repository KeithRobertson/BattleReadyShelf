import { Alert, Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { Faction } from "@/generated";

type EditFactionModalProps = Readonly<{
  faction: Faction | null;
  /** Every faction, so a parent can be picked. The faction being edited is filtered out here. */
  factions: Faction[];
  usageCount: number;
  saving: boolean;
  onClose: () => void;
  onSave: (faction: Faction, name: string, parentFactionId: string | null) => void;
}>;

function usageWarning(usageCount: number) {
  if (usageCount === 0) {
    return "No model definitions sit under this faction yet.";
  }
  if (usageCount === 1) {
    return "1 model definition sits under this faction and moves with it.";
  }
  return `${usageCount} model definitions sit under this faction and move with it.`;
}

/**
 * Proposes a new name or parent for a faction. A faction groups every model definition beneath it,
 * so reparenting one moves that whole subtree - the change is staged for review rather than applied
 * on save.
 */
export default function EditFactionModal({
  faction,
  factions,
  usageCount,
  saving,
  onClose,
  onSave,
}: EditFactionModalProps) {
  const [name, setName] = useState("");
  const [parentFactionId, setParentFactionId] = useState<string | null>(null);

  useEffect(() => {
    setName(faction?.name ?? "");
    setParentFactionId(faction?.parentFactionId ?? null);
  }, [faction]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!faction) return;
    const trimmed = name.trim();
    if (trimmed === "") return;
    onSave(faction, trimmed, parentFactionId);
  }

  const trimmedName = name.trim();
  const isUnchanged = trimmedName === (faction?.name ?? "") && parentFactionId === (faction?.parentFactionId ?? null);

  const parentOptions = [
    { value: "", label: "None" },
    ...factions.filter((f) => f.id !== faction?.id).map((f) => ({ value: f.id, label: f.name })),
  ];

  return (
    <Modal opened={faction !== null} onClose={onClose} title="Propose a faction change">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
            {usageWarning(usageCount)}
          </Alert>

          {faction?.externalId != null && (
            <Text size="sm" c="dimmed">
              Dataset id{" "}
              <Text span ff="monospace">
                {faction.externalId}
              </Text>{" "}
              is not changed here, so a future import still matches this faction.
            </Text>
          )}

          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
            required
          />

          <Select
            label="Parent faction"
            placeholder="None"
            data={parentOptions}
            value={parentFactionId ?? ""}
            onChange={(updated) => setParentFactionId(updated !== "" ? updated : null)}
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
