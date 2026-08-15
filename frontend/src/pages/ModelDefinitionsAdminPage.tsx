import { Accordion, Alert, Badge, Group, Loader, Stack, Table, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { ModelDefinition } from "../generated";
import { getModelDefinitions } from "../generated";

export default function ModelDefinitionsAdminPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN";
  const [modelDefinitions, setModelDefinitions] = useState<ModelDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    getModelDefinitions({ signal: ac.signal })
      .then((r) => {
        if (!ac.signal.aborted) setModelDefinitions(r.data ?? []);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [isAdmin]);

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Manage Model Definitions</Title>
        <Text c="dimmed">
          View the model types available to users, along with their attachment slots and wargear options.
        </Text>
      </div>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {isAuthLoading ? (
        <Loader />
      ) : !isAuthenticated || !isAdmin ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          You do not have permission to view this page.
        </Alert>
      ) : loading ? (
        <Loader />
      ) : modelDefinitions.length === 0 ? (
        <Text c="dimmed">No model definitions exist yet.</Text>
      ) : (
        <Accordion multiple defaultValue={modelDefinitions.map((md) => md.id ?? "")} variant="separated">
          {modelDefinitions.map((md) => {
            const attachmentSlots = md.attachmentSlots ?? [];
            const wargearOptions = md.wargearOptions ?? [];
            return (
              <Accordion.Item key={md.id} value={md.id ?? ""}>
                <Accordion.Control>
                  <Group gap="xs">
                    <Text fw={500}>{md.name}</Text>
                    {attachmentSlots.length > 0 && (
                      <Badge variant="light">
                        {attachmentSlots.length} slot{attachmentSlots.length === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  {attachmentSlots.length === 0 ? (
                    <Text c="dimmed" size="sm">
                      No attachment slots defined for this model.
                    </Text>
                  ) : (
                    <Table striped withTableBorder verticalSpacing="xs">
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Attachment slot</Table.Th>
                          <Table.Th>Wargear options</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {attachmentSlots.map((slot) => {
                          const optionsForSlot = wargearOptions.filter((option) =>
                            option.attachmentSlotIds?.includes(slot.id ?? ""),
                          );
                          return (
                            <Table.Tr key={slot.id}>
                              <Table.Td>{slot.name}</Table.Td>
                              <Table.Td>
                                {optionsForSlot.length === 0 ? (
                                  <Text c="dimmed" size="sm">
                                    None
                                  </Text>
                                ) : (
                                  <Group gap={4}>
                                    {optionsForSlot.map((option) => (
                                      <Badge
                                        key={option.id}
                                        variant={option.isDefault ? "filled" : "light"}
                                        size="sm"
                                        title={option.isDefault ? "Default" : undefined}
                                      >
                                        {option.name}
                                      </Badge>
                                    ))}
                                  </Group>
                                )}
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}
    </Stack>
  );
}
