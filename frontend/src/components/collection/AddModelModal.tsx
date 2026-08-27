import { Button, Group, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { CollectionAddModelForm, type CollectionAddModelFormProps } from "./CollectionAddModelForm";

export function AddModelModal(props: CollectionAddModelFormProps) {
  const [opened, { open, close }] = useDisclosure(false);
  if (!props.isOwner || !props.isEditMode) return null;

  return (
    <Group justify="flex-start">
      <Button leftSection={<IconPlus size={16} />} onClick={open} variant="filled" w="auto">
        Add model
      </Button>

      <Modal opened={opened} onClose={close} title="Add model" size="lg" centered>
        <CollectionAddModelForm {...props} onSubmitted={close} />
      </Modal>
    </Group>
  );
}
