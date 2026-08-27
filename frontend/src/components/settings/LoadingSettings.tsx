import { Loader, Stack, Title } from "@mantine/core";

export function LoadingSettings() {
  return (
    <Stack gap="xl">
      <Title order={2}>Settings</Title>
      <Loader />
    </Stack>
  );
}
