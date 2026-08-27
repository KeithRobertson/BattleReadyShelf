import { Alert, Stack, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export function UnauthenticatedSettings() {
  return (
    <Stack gap="xl">
      <Title order={2}>Settings</Title>
      <Alert color="blue" icon={<IconAlertCircle size={16} />}>
        Sign in with Google (top right) to manage your settings.
      </Alert>
    </Stack>
  );
}
