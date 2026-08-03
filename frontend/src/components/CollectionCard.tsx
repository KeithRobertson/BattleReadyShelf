import { Card, Group, Text, UnstyledButton } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { ArmyCollection } from "../generated";

export default function CollectionCard({ collection }: { collection: ArmyCollection }) {
  const navigate = useNavigate();

  return (
    <UnstyledButton
      onClick={() => collection.id && navigate(`/collections/${collection.id}`)}
      style={{ display: "block", width: "100%" }}
    >
      <Card withBorder radius="md" padding="lg" shadow="sm">
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text fw={600}>{collection.name}</Text>
            {collection.description && (
              <Text size="sm" c="dimmed" lineClamp={2}>
                {collection.description}
              </Text>
            )}
          </div>
          <IconChevronRight size={18} stroke={1.5} />
        </Group>
      </Card>
    </UnstyledButton>
  );
}
