import { Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import { CollectionAddModelForm, type CollectionAddModelFormProps } from "./CollectionAddModelForm";

const ADD_MODEL_FORM_ID = "collection-add-model-form";

export function AddModelModal(props: CollectionAddModelFormProps) {
  const [opened, { open, close }] = useDisclosure(false);
  if (!props.isOwner || !props.isEditMode) return null;

  const hasModelDefinitions = props.collectionMetaData.modelDefinitions.length > 0;

  return (
    <Group justify="flex-start">
      <Button leftSection={<IconPlus size={16} />} onClick={open} variant="filled" w="auto">
        Add model
      </Button>

      <ResponsiveModal
        opened={opened}
        onClose={close}
        title="Add model"
        size="lg"
        centered
        footer={
          hasModelDefinitions ? (
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>
                Cancel
              </Button>
              {/* Sits outside the form element, so it submits it by id rather than by nesting. */}
              <Button
                type="submit"
                form={ADD_MODEL_FORM_ID}
                leftSection={<IconPlus size={16} />}
                loading={props.loading}
              >
                {Number(props.count) > 1 ? `Add ${props.count} models` : "Add model"}
              </Button>
            </Group>
          ) : undefined
        }
      >
        <CollectionAddModelForm {...props} formId={ADD_MODEL_FORM_ID} onSubmitted={close} />
      </ResponsiveModal>
    </Group>
  );
}
