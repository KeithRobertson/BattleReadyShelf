import { Alert, Badge, Button, Checkbox, Group, Loader, Select, Stack, Table, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import type { UserDto, UserRole } from "@/generated";
import { bulkUpdateUserRoles, getUsers, updateUserRole } from "@/generated";

const ASSIGNABLE_ROLES: UserRole[] = ["GUEST", "USER", "ADMIN"];

function isEditable(user: UserDto, currentUserId?: string): boolean {
  return user.role !== "SUPERADMIN" && user.id !== currentUserId;
}

export default function UsersAdminPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<UserRole>("USER");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    getUsers({ signal: ac.signal })
      .then((r) => {
        if (!ac.signal.aborted) setUsers(r.data ?? []);
      })
      .catch((e) => {
        if (!ac.signal.aborted) setError(String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [isAdmin]);

  const editableUserIds = useMemo(
    () =>
      users
        .filter((u) => isEditable(u, currentUser?.id))
        .map((u) => u.id)
        .filter((id): id is string => !!id),
    [users, currentUser?.id],
  );
  const allEditableSelected = editableUserIds.length > 0 && editableUserIds.every((id) => selectedIds.has(id));

  function toggleSelected(userId: string) {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(allEditableSelected ? new Set() : new Set(editableUserIds));
  }

  async function handleIndividualRoleChange(userId: string, role: UserRole) {
    setError(null);
    setSavingUserId(userId);
    try {
      const updated = (await updateUserRole({ path: { userId }, body: { role } })).data;
      if (updated) {
        setUsers((s) => s.map((u) => (u.id === userId ? updated : u)));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleBulkApply() {
    setError(null);
    setBulkSaving(true);
    try {
      const updated = (await bulkUpdateUserRoles({ body: { userIds: [...selectedIds], role: bulkRole } })).data;
      if (updated) {
        const updatedById = new Map(updated.map((u) => [u.id, u]));
        setUsers((s) => s.map((u) => (u.id ? (updatedById.get(u.id) ?? u) : u)));
      }
      setSelectedIds(new Set());
    } catch (e) {
      setError(String(e));
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Manage Users</Title>
        <Text c="dimmed">View all users and manage their roles. Superadmins cannot be modified.</Text>
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
      ) : (
        <Stack gap="sm">
          {selectedIds.size > 0 && (
            <Group>
              <Text size="sm">{selectedIds.size} selected</Text>
              <Select
                data={ASSIGNABLE_ROLES}
                value={bulkRole}
                onChange={(v) => v && setBulkRole(v as UserRole)}
                allowDeselect={false}
                w={160}
              />
              <Button onClick={handleBulkApply} loading={bulkSaving}>
                Apply to selected
              </Button>
            </Group>
          )}

          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={40}>
                  <Checkbox
                    checked={allEditableSelected}
                    indeterminate={selectedIds.size > 0 && !allEditableSelected}
                    onChange={toggleSelectAll}
                    disabled={editableUserIds.length === 0}
                  />
                </Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Display Name</Table.Th>
                <Table.Th>Role</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.map((u) => {
                const editable = isEditable(u, currentUser?.id);
                const isSelf = u.id === currentUser?.id;
                return (
                  <Table.Tr key={u.id} style={editable ? undefined : { opacity: 0.5 }}>
                    <Table.Td>
                      <Checkbox
                        checked={!!u.id && selectedIds.has(u.id)}
                        onChange={() => u.id && toggleSelected(u.id)}
                        disabled={!editable}
                      />
                    </Table.Td>
                    <Table.Td>{u.email}</Table.Td>
                    <Table.Td>
                      {u.displayName || <Text c="dimmed">—</Text>}
                      {isSelf && (
                        <Badge ml="xs" size="sm" variant="light">
                          You
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {editable ? (
                        <Select
                          data={ASSIGNABLE_ROLES}
                          value={u.role}
                          onChange={(v) => v && u.id && handleIndividualRoleChange(u.id, v as UserRole)}
                          allowDeselect={false}
                          disabled={savingUserId === u.id}
                          w={140}
                        />
                      ) : (
                        <Badge color={u.role === "SUPERADMIN" ? "grape" : "gray"} variant="light">
                          {u.role}
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Stack>
      )}
    </Stack>
  );
}
