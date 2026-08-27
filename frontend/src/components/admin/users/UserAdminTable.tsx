import { Badge, Checkbox, Select, Table, Text } from "@mantine/core";
import type { UserDto, UserRole } from "@/generated";
import { ASSIGNABLE_ROLES } from "@/pages/UsersAdminPage.tsx";

export type UserAdminTableProps = Readonly<{
  users: UserDto[];
  selectedIds: Set<string>;
  editableUserIds: string[];
  savingUserId: string | null;
  currentUserId: string | undefined;
  onToggleSelected: (userId: string) => void;
  onToggleSelectAll: () => void;
  onRoleChange: (userId: string, role: UserRole) => Promise<void>;
}>;

function isEditable(user: UserDto, currentUserId?: string): boolean {
  return user.role !== "SUPERADMIN" && user.id !== currentUserId;
}

export function UserAdminTable({
  users,
  selectedIds,
  editableUserIds,
  savingUserId,
  currentUserId,
  onToggleSelected,
  onToggleSelectAll,
  onRoleChange,
}: UserAdminTableProps) {
  const allEditableSelected = editableUserIds.length > 0 && editableUserIds.every((id) => selectedIds.has(id));

  return (
    <Table striped highlightOnHover verticalSpacing="sm">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={40}>
            <Checkbox
              checked={allEditableSelected}
              indeterminate={selectedIds.size > 0 && !allEditableSelected}
              onChange={onToggleSelectAll}
              disabled={editableUserIds.length === 0}
            />
          </Table.Th>
          <Table.Th>Email</Table.Th>
          <Table.Th>Display Name</Table.Th>
          <Table.Th>Role</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {users.map((user) => {
          const editable = isEditable(user, currentUserId);
          const isSelf = user.id === currentUserId;
          return (
            <Table.Tr key={user.id} style={editable ? undefined : { opacity: 0.5 }}>
              <Table.Td>
                <Checkbox
                  checked={!!user.id && selectedIds.has(user.id)}
                  onChange={() => user.id && onToggleSelected(user.id)}
                  disabled={!editable}
                />
              </Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>
                {user.displayName || <Text c="dimmed">—</Text>}
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
                    value={user.role}
                    onChange={(role) => role && user.id && onRoleChange(user.id, role as UserRole)}
                    allowDeselect={false}
                    disabled={savingUserId === user.id}
                    w={140}
                  />
                ) : (
                  <Badge color={user.role === "SUPERADMIN" ? "grape" : "gray"} variant="light">
                    {user.role}
                  </Badge>
                )}
              </Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
  );
}
