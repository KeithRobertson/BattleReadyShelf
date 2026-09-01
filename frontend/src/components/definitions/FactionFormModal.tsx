import { Button, Group, Modal, Select, Stack, Text, TextInput } from "@mantine/core";
import type React from "react";
import { type ReactNode, useEffect, useState } from "react";
import type { Faction } from "@/generated";

type FactionFormModalProps = Readonly<{
  opened: boolean;
  title: string;
  submitLabel: string;
  /** Context shown above the fields, e.g. an admin warning about what a reparent will move. */
  notice?: ReactNode;
  /** The faction being edited, or null when creating a new one. */
  faction: Faction | null;
  /** The factions a parent can be picked from. The one being edited is filtered out here. */
  factions: Faction[];
  saving: boolean;
  onClose: () => void;
  onSave: (name: string, parentFactionId: string | null) => void;
}>;

/**
 * The name and parent of a faction. Shared by the admin page, where saving stages a change for
 * review, and a user's own factions page, where saving applies immediately - the fields and the
 * validation are the same either way, so only the wording and the notice differ.
 */
export default function FactionFormModal({
  opened,
  title,
  submitLabel,
  notice,
  faction,
  factions,
  saving,
  onClose,
  onSave,
}: FactionFormModalProps) {
  const [name, setName] = useState("");
  const [parentFactionId, setParentFactionId] = useState<string | null>(null);

  useEffect(() => {
    setName(faction?.name ?? "");
    setParentFactionId(faction?.parentFactionId ?? null);
  }, [faction]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") return;
    onSave(trimmed, parentFactionId);
  }

  const trimmedName = name.trim();
  const isUnchanged = trimmedName === (faction?.name ?? "") && parentFactionId === (faction?.parentFactionId ?? null);

  const parentOptions = [
    { value: "", label: "None" },
    ...factions.filter((f) => f.id !== faction?.id).map((f) => ({ value: f.id, label: f.name })),
  ];

  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <Stack>
          {notice}

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
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
