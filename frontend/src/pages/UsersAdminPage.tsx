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
    getUsers({ signal: abortController.signal, throwOnError: true })
      .then((response) => {
        if (!abortController.signal.aborted) dispatch({ type: "loadSuccess", users: response.data ?? [] });
      })
      .catch(() => {
        // The reason arrives from the API layer as a notification; the page only has to stop
        // presenting an empty table as though there were no users.
        if (!abortController.signal.aborted) dispatch({ type: "loadFailed" });
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
      const updated = (await updateUserRole({ path: { userId }, body: { role }, throwOnError: true })).data;
      if (updated) {
        dispatch({
          type: "loadSuccess",
          users: state.users.map((u) => (u.id === userId ? updated : u)),
        });
      }
    } catch {
      // Reported as a notification by the API layer. The table is left showing the role the server
      // still has, so the select snaps back rather than claiming a change that did not happen.
    } finally {
      dispatch({ type: "savingEnd" });
    }
  }

  async function handleBulkApply() {
    dispatch({ type: "bulkSavingStart" });
    try {
      const updated = (
        await bulkUpdateUserRoles({
          body: { userIds: [...state.selectedIds], role: state.bulkRole },
          throwOnError: true,
        })
      ).data;
      if (updated) {
        dispatch({
          type: "bulkApplySuccess",
          updated,
        });
      }
    } catch {
      // Reported as a notification by the API layer; the selection stays put so it can be retried.
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

      {state.loadFailed && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          The users could not be loaded. Reload the page to try again.
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
