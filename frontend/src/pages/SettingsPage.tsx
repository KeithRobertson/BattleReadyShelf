import { Alert, Loader, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { ThemePreference } from "../generated";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, setThemePreference } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    setError(null);
    setIsSaving(true);
    try {
      await setThemePreference(value as ThemePreference);
    } catch (e) {
      setError(String(e));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Stack gap="xl">
      <Title order={2}>Settings</Title>

      {isLoading ? (
        <Loader />
      ) : !isAuthenticated ? (
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          Sign in with Google (top right) to manage your settings.
        </Alert>
      ) : (
        <Stack gap={4}>
          <Text fw={500}>Appearance</Text>
          <Text size="sm" c="dimmed">
            Choose how BattleReadyShelf looks. "Auto" follows your device's system setting. This is saved to your
            account and follows you across devices.
          </Text>
          {error && (
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
          )}
          <SegmentedControl
            value={user?.themePreference ?? "AUTO"}
            onChange={handleChange}
            disabled={isSaving}
            data={[
              { label: "Light", value: "LIGHT" },
              { label: "Dark", value: "DARK" },
              { label: "Auto", value: "AUTO" },
            ]}
            w={280}
          />
        </Stack>
      )}
    </Stack>
  );
}
