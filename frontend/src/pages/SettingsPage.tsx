import { SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { useReducer } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingSettings } from "@/components/settings/LoadingSettings.tsx";
import { settingsReducer } from "@/components/settings/settingsReducer.ts";
import { UnauthenticatedSettings } from "@/components/settings/UnauthenticatedSettings.tsx";
import type { ThemePreference } from "@/generated";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, setThemePreference } = useAuth();
  const [state, dispatch] = useReducer(settingsReducer, { isSaving: false });

  async function handleChange(value: ThemePreference) {
    dispatch({ type: "startSaving" });

    try {
      await setThemePreference(value);
    } catch {
      // Reported as a notification by the API layer. The control follows the preference the server
      // still has, so it snaps back rather than showing a theme that was never saved.
    } finally {
      dispatch({ type: "saved" });
    }
  }

  if (isLoading) return <LoadingSettings />;
  if (!isAuthenticated) return <UnauthenticatedSettings />;

  return (
    <Stack gap="xl">
      <Title order={2}>Settings</Title>
      <Stack gap={4}>
        <Text fw={500}>Appearance</Text>
        <Text size="sm" c="dimmed">
          Choose how BattleReadyShelf looks. "Auto" follows your device's system setting. This is saved to your account
          and follows you across devices.
        </Text>
        <SegmentedControl
          value={user?.themePreference ?? "AUTO"}
          onChange={handleChange}
          disabled={state.isSaving}
          data={[
            { label: "Light", value: "LIGHT" },
            { label: "Dark", value: "DARK" },
            { label: "Auto", value: "AUTO" },
          ]}
          w={280}
        />
      </Stack>
    </Stack>
  );
}
