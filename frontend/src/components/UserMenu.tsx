import { Avatar, Group, Menu, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconLogout, IconSettings } from "@tabler/icons-react";
import type { UserDto } from "@/generated";
import initialsFor from "@/utils/user";

interface UserMenuProps {
  user: UserDto | null;
  onLogout: () => void;
  onNavigateToSettings: () => void;
}

export function UserMenu({ user, onLogout, onNavigateToSettings }: Readonly<UserMenuProps>) {
  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <UnstyledButton>
          <Group gap={7}>
            <Avatar radius="xl" size={32}>
              {initialsFor(user?.displayName, user?.email)}
            </Avatar>
            <IconChevronDown size={14} stroke={1.5} />
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" truncate>
            {user?.displayName || user?.email}
          </Text>
        </Menu.Label>

        <Menu.Item leftSection={<IconSettings size={16} />} onClick={onNavigateToSettings}>
          Settings
        </Menu.Item>

        <Menu.Item leftSection={<IconLogout size={16} />} onClick={onLogout}>
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
