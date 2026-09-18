import { Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import { useAsideContent } from "@/hooks/useAsideContent.ts";

export default function ArmyBuilderPage() {
  const aside = useMemo(
    () => (
      <AsidePanel
        title="Army Builder"
        description="Army lists are not built here yet. Collections and the catalogue are the parts that exist today."
      />
    ),
    [],
  );
  useAsideContent(aside);

  return (
    <Stack gap="xs">
      <Title order={2}>Army Builder</Title>
      <Text c="dimmed">Building and validating army lists is coming soon.</Text>
    </Stack>
  );
}
