import { Alert, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useReducer } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingSettings } from "@/components/settings/LoadingSettings.tsx";
import { settingsReducer } from "@/components/settings/settingsReducer.ts";
import { UnauthenticatedSettings } from "@/components/settings/UnauthenticatedSettings.tsx";
import type { ThemePreference } from "@/generated";

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading, setThemePreference } = useAuth();
  const [state, dispatch] = useReducer(settingsReducer, {
    isSaving: false,
    error: null,
  });

  async function handleChange(value: ThemePreference) {
    dispatch({ type: "startSaving" });

    try {
      await setThemePreference(value);
      dispatch({ type: "success" });
    } catch (e) {
      dispatch({ type: "error", error: String(e) });
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
        {state.error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {state.error}
          </Alert>
        )}
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
