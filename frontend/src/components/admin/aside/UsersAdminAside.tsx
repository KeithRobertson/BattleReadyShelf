import { Button, Divider, Select, Stack, Text } from "@mantine/core";
import { AdminHealthAside } from "@/components/admin/aside/AdminHealthAside.tsx";
import { ASSIGNABLE_ROLES } from "@/components/admin/users/userAdminReducer.ts";
import type { UserDto, UserRole } from "@/generated";
import { countUsersByRole } from "@/utils/admin/catalogueStats";

export type UsersAdminAsideProps = Readonly<{
  users: UserDto[];
  loadFailed: boolean;
  selectedCount: number;
  bulkRole: UserRole;
  bulkSaving: boolean;
  onBulkRoleChange: (role: UserRole) => void;
  onBulkApply: () => void;
}>;

export function UsersAdminAside({
  users,
  loadFailed,
  selectedCount,
  bulkRole,
  bulkSaving,
  onBulkRoleChange,
  onBulkApply,
}: UsersAdminAsideProps) {
  return (
    <AdminHealthAside
      title="Users"
      description="Everyone with access, grouped by role. Superadmins cannot be modified."
      loadFailed={loadFailed}
      failedMessage="The user list could not be loaded."
      totalLabel="Total"
      total={users.length}
      lists={[{ title: "By role", items: countUsersByRole(users) }]}
    >
      {selectedCount > 0 && (
        <Stack gap="sm">
          <Divider />
          <Text size="sm" fw={600}>
            {selectedCount} selected
          </Text>
          <Select
            data={ASSIGNABLE_ROLES}
            value={bulkRole}
            onChange={(role) => role && onBulkRoleChange(role as UserRole)}
            allowDeselect={false}
            w="100%"
          />
          <Button onClick={onBulkApply} loading={bulkSaving}>
            Apply to selected
          </Button>
        </Stack>
      )}
    </AdminHealthAside>
  );
}
