import { Card, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight, IconStack2 } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { ArmyCollection } from "../generated";

export default function CollectionCard({
  collection,
  modelCount,
}: {
  collection: ArmyCollection;
  modelCount?: number;
}) {
  const navigate = useNavigate();

  return (
    <UnstyledButton
      onClick={() => collection.id && navigate(`/collections/${collection.id}`)}
      style={{ display: "block", width: "100%" }}
    >
      <Card withBorder radius="md" padding="lg" shadow="sm">
        <Group justify="space-between" wrap="nowrap" align="center">
          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} size="lg">
              {collection.name}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {collection.description || "No description"}
            </Text>
          </Stack>

          <Group gap="xl" wrap="nowrap">
            {/* Stats panel: model count today, total points etc. later */}
            <Stack gap={0} align="center" miw={80}>
              <Text fw={700} size="xl">
                {modelCount ?? "–"}
              </Text>
              <Group gap={4} wrap="nowrap">
                <IconStack2 size={14} stroke={1.5} />
                <Text size="xs" c="dimmed">
                  {modelCount === 1 ? "model" : "models"}
                </Text>
              </Group>
            </Stack>
            <IconChevronRight size={20} stroke={1.5} />
          </Group>
        </Group>
      </Card>
    </UnstyledButton>
  );
}
