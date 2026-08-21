import { ActionIcon, AppShell, Avatar, Burger, Group, Menu, NavLink, Text, Title, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { GoogleLogin } from "@react-oauth/google";
import {
  IconChevronDown,
  IconLayoutSidebarRightCollapseFilled,
  IconLayoutSidebarRightExpandFilled,
  IconLogout,
  IconSettings,
  IconShieldLock,
  IconStack2,
  IconSwords,
  IconTags,
  IconTagsChevronUp,
  IconUser,
  IconUsers,
  IconWorld,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function initialsFor(displayName?: string, email?: string): string {
  const source = displayName?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const adminNavItems = [
  { label: "Manage Users", to: "/admin/users", icon: IconUsers },
  { label: "Manage Model Definitions", to: "/admin/model-definitions", icon: IconTags },
  { label: "Manage Faction Definitions", to: "/admin/faction-definitions", icon: IconTagsChevronUp },
];

export default function AppLayout() {
  const { user, isAuthenticated, isLoading, loginWithGoogleIdToken, logout } = useAuth();
  const [asideContent, setAsideContent] = useState<ReactNode>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const initialNavOpenedState = localStorage.getItem("navOpened") !== "false";
  const [navOpened, { toggle: toggleNav }] = useDisclosure(initialNavOpenedState);

  useEffect(() => {
    localStorage.setItem("navOpened", navOpened.toString());
  }, [navOpened]);

  const initialAsideState = localStorage.getItem("asideOpened") === "true";
  const [asideOpened, { toggle: toggleAsideOpened }] = useDisclosure(initialAsideState);

  useEffect(() => {
    localStorage.setItem("asideOpened", asideOpened.toString());
  }, [asideOpened]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPERADMIN";
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isCollectionsRoute = location.pathname === "/" || location.pathname.startsWith("/collections");

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navOpened, desktop: !navOpened } }}
      padding="md"
      aside={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !asideOpened, desktop: !asideOpened },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={navOpened} onClick={toggleNav} size="sm" />
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Title order={3}>BattleReadyShelf</Title>
            </Link>
          </Group>
          <Group>
            {isLoading ? null : isAuthenticated ? (
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
            <ActionIcon variant="subtle" size="lg" onClick={toggleAsideOpened}>
              {asideOpened ? (
                <IconLayoutSidebarRightCollapseFilled size={20} />
              ) : (
                <IconLayoutSidebarRightExpandFilled size={20} />
              )}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          label="Collections"
          leftSection={<IconStack2 size={18} stroke={1.5} />}
          defaultOpened={isCollectionsRoute}
          childrenOffset={28}
        >
          <NavLink
            component={Link}
            to="/"
            label="Personal"
            leftSection={<IconUser size={18} stroke={1.5} />}
            active={location.pathname === "/" || location.pathname === "/collections"}
          />
          <NavLink
            component={Link}
            to="/collections/public"
            label="Public"
            leftSection={<IconWorld size={18} stroke={1.5} />}
            active={location.pathname === "/collections/public"}
          />
        </NavLink>
        <NavLink
          component={Link}
          to="/army-builder"
          label="Army Builder"
          leftSection={<IconSwords size={18} stroke={1.5} />}
          active={location.pathname === "/army-builder"}
        />
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
              />
            ))}
          </NavLink>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet context={{ setAsideContent }} />
      </AppShell.Main>
      <AppShell.Aside p="md">{asideContent}</AppShell.Aside>
    </AppShell>
  );
}
