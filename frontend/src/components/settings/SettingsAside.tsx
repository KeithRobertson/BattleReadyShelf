import { Stack, Text } from "@mantine/core";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import type { ThemePreference, UserDto } from "@/generated";

const THEME_LABELS: Record<ThemePreference, string> = {
  LIGHT: "Light",
  DARK: "Dark",
  AUTO: "Auto",
};

export type SettingsAsideProps = Readonly<{
  user: UserDto;
}>;

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm">{value}</Text>
    </div>
  );
}

export function SettingsAside({ user }: SettingsAsideProps) {
  const theme = user.themePreference ?? "AUTO";
  return (
    <AsidePanel title="Account" description="What is stored on this sign-in.">
      <Stack gap="sm">
        <Detail label="Email" value={user.email} />
        {user.displayName && <Detail label="Display name" value={user.displayName} />}
        <Detail label="Role" value={user.role ?? "GUEST"} />
        <Detail label="Appearance" value={THEME_LABELS[theme]} />
      </Stack>
    </AsidePanel>
  );
}
