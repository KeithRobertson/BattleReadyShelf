import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export type CollectionsErrorProps = Readonly<{ error: Error | null }>;

export function CollectionsError({ error }: CollectionsErrorProps) {
  if (!error) return null;

  return (
    <Alert color="red" icon={<IconAlertCircle size={16} />}>
      {error.message}
    </Alert>
  );
}
