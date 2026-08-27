import { Alert, Button, Group, Select, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEffect, useMemo, useReducer } from "react";
import { useAuth } from "@/auth/useAuth";
import { LoadingUserAdmin } from "@/components/admin/users/LoadingUserAdmin.tsx";
import { UnauthenticatedUserAdmin } from "@/components/admin/users/UnauthenticatedUserAdmin.tsx";
import { UserAdminTable } from "@/components/admin/users/UserAdminTable.tsx";
import { initialUserAdminState, userAdminReducer } from "@/components/admin/users/userAdminReducer.ts";
import type { UserDto, UserRole } from "@/generated";
import { bulkUpdateUserRoles, getUsers, updateUserRole } from "@/generated";

export const ASSIGNABLE_ROLES: UserRole[] = ["GUEST", "USER", "ADMIN"];

function isEditable(user: UserDto, currentUserId?: string): boolean {
  return user.role !== "SUPERADMIN" && user.id !== currentUserId;
}

export default function UsersAdminPage() {
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading, isAdmin } = useAuth();
  const [state, dispatch] = useReducer(userAdminReducer, initialUserAdminState);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    const abortController = new AbortController();
    dispatch({ type: "loadStart" });
    getUsers({ signal: abortController.signal })
      .then((response) => {
        if (!abortController.signal.aborted) dispatch({ type: "loadSuccess", users: response.data ?? [] });
      })
      .catch((e) => {
        if (!abortController.signal.aborted) dispatch({ type: "loadError", error: String(e) });
      });
    return () => abortController.abort();
  }, [isAdmin]);

  const editableUserIds = useMemo(
    () =>
      state.users
        .filter((user) => isEditable(user, currentUser?.id))
        .map((user) => user.id)
        .filter((id): id is string => !!id),
    [state.users, currentUser?.id],
  );

  function toggleSelected(userId: string) {
    dispatch({ type: "toggleSelected", userId });
  }

  function toggleSelectAll() {
    dispatch({
      type: "toggleSelectAll",
      editableIds: editableUserIds,
    });
  }

  async function handleIndividualRoleChange(userId: string, role: UserRole) {
    dispatch({ type: "savingStart", userId });
    try {
      const updated = (await updateUserRole({ path: { userId }, body: { role } })).data;
      if (updated) {
        dispatch({
          type: "loadSuccess",
          users: state.users.map((u) => (u.id === userId ? updated : u)),
        });
      }
    } catch (e) {
      dispatch({
        type: "loadError",
        error: String(e),
      });
    } finally {
      dispatch({ type: "savingEnd" });
    }
  }

  async function handleBulkApply() {
    dispatch({ type: "bulkSavingStart" });
    try {
      const updated = (await bulkUpdateUserRoles({ body: { userIds: [...state.selectedIds], role: state.bulkRole } }))
        .data;
      if (updated) {
        dispatch({
          type: "bulkApplySuccess",
          updated,
        });
      }
    } catch (e) {
      dispatch({
        type: "loadError",
        error: String(e),
      });
    } finally {
      dispatch({ type: "bulkSavingEnd" });
    }
  }
  if (isAuthLoading || state.loading) return <LoadingUserAdmin />;
  if (!isAuthenticated || !isAdmin) return <UnauthenticatedUserAdmin />;
  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Manage Users</Title>
        <Text c="dimmed">View all users and manage their roles. Superadmins cannot be modified.</Text>
      </div>

      {state.error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {state.error}
        </Alert>
      )}

      <Stack gap="sm">
        {state.selectedIds.size > 0 && (
          <Group>
            <Text size="sm">{state.selectedIds.size} selected</Text>
            <Select
              data={ASSIGNABLE_ROLES}
              value={state.bulkRole}
              onChange={(role) => role && dispatch({ type: "setBulkRole", role: role as UserRole })}
              allowDeselect={false}
              w={160}
            />
            <Button onClick={handleBulkApply} loading={state.bulkSaving}>
              Apply to selected
            </Button>
          </Group>
        )}
        <UserAdminTable
          users={state.users}
          selectedIds={state.selectedIds}
          editableUserIds={editableUserIds}
          savingUserId={state.savingUserId}
          currentUserId={currentUser?.id}
          onToggleSelected={toggleSelected}
          onToggleSelectAll={toggleSelectAll}
          onRoleChange={handleIndividualRoleChange}
        />
      </Stack>
    </Stack>
  );
}
