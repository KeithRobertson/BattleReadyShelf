import { AppShell, Avatar, Burger, Group, Menu, NavLink, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { GoogleLogin } from "@react-oauth/google";
import {
  IconChevronDown,
  IconLogout,
  IconSettings,
  IconShieldLock,
  IconStack2,
  IconSwords,
  IconTags,
  IconUsers,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function initialsFor(displayName?: string, email?: string): string {
  const source = displayName?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const navItems = [
  { label: "Collections", to: "/", icon: IconStack2 },
  { label: "Army Builder", to: "/army-builder", icon: IconSwords },
];

const adminNavItems = [
  { label: "Manage Users", to: "/admin/users", icon: IconUsers },
  { label: "Manage Model Definitions", to: "/admin/model-definitions", icon: IconTags },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loginWithGoogleIdToken, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpened, { toggle: toggleNav }] = useDisclosure();
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navOpened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={navOpened} onClick={toggleNav} hiddenFrom="sm" size="sm" />
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Title order={3}>BattleReadyShelf</Title>
            </Link>
          </Group>
          {isAuthenticated ? (
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
                <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => navigate("/settings")}>
                  Settings
                </Menu.Item>
                <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
                  Log out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <div style={{ colorScheme: "light" }}>
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (credentialResponse.credential) {
                    loginWithGoogleIdToken(credentialResponse.credential).catch((err) => {
                      console.error("Google login failed", err);
                    });
                  }
                }}
                onError={() => console.error("Google login failed")}
                size="medium"
                theme="filled_blue"
                useOneTap
                auto_select
              />
            </div>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={location.pathname === item.to}
            onClick={toggleNav}
          />
        ))}
        {isAdmin && (
          <NavLink
            label="Administration"
            leftSection={<IconShieldLock size={18} stroke={1.5} />}
            defaultOpened={isAdminRoute}
            childrenOffset={28}
          >
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={item.label}
                leftSection={<item.icon size={18} stroke={1.5} />}
                active={location.pathname === item.to}
                onClick={toggleNav}
              />
            ))}
          </NavLink>
        )}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
