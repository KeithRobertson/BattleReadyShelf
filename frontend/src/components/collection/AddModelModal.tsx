import { Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import ResponsiveModal from "@/components/ResponsiveModal.tsx";
import { CollectionAddModelForm, type CollectionAddModelFormProps } from "./CollectionAddModelForm";

const ADD_MODEL_FORM_ID = "collection-add-model-form";

export type AddModelModalProps = CollectionAddModelFormProps &
  Readonly<{
    opened: boolean;
    onClose: () => void;
  }>;

export function AddModelModal({ opened, onClose, ...props }: AddModelModalProps) {
  if (!props.isOwner) return null;

  const hasModelDefinitions = props.collectionMetaData.modelDefinitions.length > 0;

  return (
    <ResponsiveModal
      opened={opened}
      onClose={onClose}
      title="Add model"
      size="lg"
      centered
      footer={
        hasModelDefinitions ? (
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            {/* Sits outside the form element, so it submits it by id rather than by nesting. */}
            <Button type="submit" form={ADD_MODEL_FORM_ID} leftSection={<IconPlus size={16} />} loading={props.loading}>
              {Number(props.count) > 1 ? `Add ${props.count} models` : "Add model"}
            </Button>
          </Group>
        ) : undefined
      }
    >
      <CollectionAddModelForm {...props} formId={ADD_MODEL_FORM_ID} onSubmitted={onClose} />
    </ResponsiveModal>
  );
}
