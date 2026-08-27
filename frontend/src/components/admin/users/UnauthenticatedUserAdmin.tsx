import { Alert, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export function UnauthenticatedUserAdmin() {
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Manage Users</Title>
        <Text c="dimmed">View all users and manage their roles. Superadmins cannot be modified.</Text>
      </div>

      <Alert color="red" icon={<IconAlertCircle size={16} />}>
        You do not have permission to view this page.
      </Alert>
    </Stack>
  );
}
