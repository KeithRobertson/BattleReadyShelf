import { Button, Stack, Text, Title } from "@mantine/core";
import { IconMoodSad } from "@tabler/icons-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AsidePanel } from "@/components/aside/AsidePanel.tsx";
import { useAsideContent } from "@/hooks/useAsideContent.ts";

export type NotFoundPageProps = Readonly<{
  title?: string;
  message?: string;
}>;

export default function NotFoundPage({
  title = "Page not found",
  message = "The page you're looking for doesn't exist or may have been removed.",
}: NotFoundPageProps) {
  const aside = useMemo(() => <AsidePanel title={title} description={message} />, [title, message]);
  useAsideContent(aside);

  return (
    <Stack align="center" gap="xs" py={80}>
      <IconMoodSad size={48} stroke={1.5} />
      <Title order={2}>{title}</Title>
      <Text c="dimmed">{message}</Text>
      <Button component={Link} to="/" mt="sm">
        Back to collections
      </Button>
    </Stack>
  );
}
