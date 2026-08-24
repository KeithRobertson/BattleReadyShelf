import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export function CollectionsError({ error }: Readonly<{ error: Error | null }>) {
  if (!error) return null;

  return (
    <Alert color="red" icon={<IconAlertCircle size={16} />}>
      {error.message}
    </Alert>
  );
}
