import { Alert } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export type CollectionsErrorProps = Readonly<{ error: Error | null }>;

/**
 * Explains why the page has nothing on it. Only that much: the reason arrives from the API layer as
 * a notification, so repeating it here would put the same sentence on screen twice.
 */
export function CollectionsError({ error }: CollectionsErrorProps) {
  if (!error) return null;

  return (
    <Alert color="red" icon={<IconAlertCircle size={16} />}>
      Your collections could not be loaded. Reload the page to try again.
    </Alert>
  );
}
