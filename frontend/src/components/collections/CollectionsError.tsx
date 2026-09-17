import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import extractErrorMessage from "@/utils/extractErrorMessage.ts";

export type CollectionsErrorProps = Readonly<{ error: Error | null }>;

export function CollectionsError({ error }: CollectionsErrorProps) {
  if (!error) return null;

  return (
    <Alert color="red" icon={<IconAlertCircle size={16} />}>
      {extractErrorMessage(error)}
    </Alert>
  );
}
