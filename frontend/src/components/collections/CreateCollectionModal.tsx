import { Button, Group, Modal, Stack, Switch, Textarea, TextInput } from "@mantine/core";

export type CreateCollectionModalProps = Readonly<{
  opened: boolean;
  close: () => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  isPublic: boolean;
  setIsPublic: (v: boolean) => void;
  handleCreate: (e: React.SubmitEvent) => void;
}>;

export function CreateCollectionModal({
  opened,
  close,
  name,
  setName,
  description,
  setDescription,
  isPublic,
  setIsPublic,
  handleCreate,
}: CreateCollectionModalProps) {
  return (
    <Modal opened={opened} onClose={close} title="Create collection">
      <form onSubmit={handleCreate}>
        <Stack>
          <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          <Switch
            label="Public collection"
            description="Allow anyone to view this collection"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button type="submit">Create</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
