import { ActionIcon, AppShell, Burger, Group, NavLink, Title } from "@mantine/core";
import {
  IconLayoutSidebarRightCollapseFilled,
  IconLayoutSidebarRightExpandFilled,
  IconShieldLock,
  IconStack2,
  IconSwords,
  IconTools,
  IconUser,
  IconWorld,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton.tsx";
import { useAuth } from "@/auth/useAuth";
import PageSkeleton from "@/components/PageSkeleton.tsx";
import { UserMenu } from "@/components/UserMenu.tsx";
import { adminNavItems } from "@/config/admin/navigation";
import { useResponsivePersistentDisclosure } from "@/hooks/useResponsivePersistentDisclosure.ts";

export default function AppLayout() {
  const { user, isAuthenticated, isLoading, loginWithGoogleIdToken, logout, isAdmin } = useAuth();
  const [asideContent, setAsideContent] = useState<ReactNode>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleNavOnMobile = () => {
    if (isMobile) {
      toggleNav();
    }
  };
  const { opened: navOpened, toggle: toggleNav, isMobile } = useResponsivePersistentDisclosure("navOpened");
  const { opened: asideOpened, toggle: toggleAside } = useResponsivePersistentDisclosure("asideOpened");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isCollectionsRoute = location.pathname === "/" || location.pathname.startsWith("/collections");

  const AsideIcon = asideOpened ? IconLayoutSidebarRightCollapseFilled : IconLayoutSidebarRightExpandFilled;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: "sm", collapsed: { mobile: !navOpened, desktop: !navOpened } }}
      padding="md"
      aside={{
        width: { base: 260, sm: 300, lg: 340 },
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
            {!isLoading &&
              (isAuthenticated ? (
                <UserMenu user={user} onLogout={logout} onNavigateToSettings={() => navigate("/settings")} />
              ) : (
                <GoogleLoginButton loginWithGoogleIdToken={loginWithGoogleIdToken} />
              ))}

            <ActionIcon variant="subtle" size="lg" onClick={toggleAside}>
              <AsideIcon size={20} />
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
            onClick={toggleNavOnMobile}
          />
          <NavLink
            component={Link}
            to="/collections/public"
            label="Public"
            leftSection={<IconWorld size={18} stroke={1.5} />}
            active={location.pathname === "/collections/public"}
            onClick={toggleNavOnMobile}
          />
        </NavLink>
        <NavLink
          component={Link}
          to="/army-builder"
          label="Army Builder"
          leftSection={<IconSwords size={18} stroke={1.5} />}
          active={location.pathname === "/army-builder"}
          onClick={toggleNavOnMobile}
        />
        {isAuthenticated && (
          <NavLink
            component={Link}
            to="/my/model-definitions"
            label="My Models"
            leftSection={<IconTools size={18} stroke={1.5} />}
            active={location.pathname === "/my/model-definitions"}
            onClick={toggleNavOnMobile}
          />
        )}
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
                onClick={toggleNavOnMobile}
              />
            ))}
          </NavLink>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet context={{ setAsideContent }} />
        </Suspense>
      </AppShell.Main>
      <AppShell.Aside
        p="lg"
        style={(theme) => ({
          borderLeft: `1px solid ${theme.colors.gray[3]}`,
        })}
      >
        {asideContent}
      </AppShell.Aside>
    </AppShell>
  );
}
