import { Loader, Stack, Text, Title } from "@mantine/core";

export function LoadingUserAdmin() {
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Manage Users</Title>
        <Text c="dimmed">View all users and manage their roles. Superadmins cannot be modified.</Text>
      </div>
      <Loader />
    </Stack>
  );
}
