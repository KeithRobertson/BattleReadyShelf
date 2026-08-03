import LogoutIcon from "@mui/icons-material/Logout";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Avatar,
  Box,
  Container,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { GoogleLogin } from "@react-oauth/google";
import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

function initialsFor(displayName?: string, email?: string): string {
  const source = displayName?.trim() || email || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loginWithGoogleIdToken, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  function handleLogout() {
    setAnchorEl(null);
    logout();
  }

  function handleSettings() {
    setAnchorEl(null);
    navigate("/settings");
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            BattleReadyShelf
          </Typography>
          {isAuthenticated ? (
            <Box>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                size="small"
                aria-label="Account menu"
                aria-controls={anchorEl ? "account-menu" : undefined}
                aria-haspopup="true"
              >
                <Avatar sx={{ width: 32, height: 32 }}>{initialsFor(user?.displayName, user?.email)}</Avatar>
              </IconButton>
              <Menu
                id="account-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled sx={{ opacity: "1 !important" }}>
                  <Typography variant="body2" color="text.secondary">
                    {user?.displayName || user?.email}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleSettings}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  Log out
                </MenuItem>
              </Menu>
            </Box>
          ) : (
            <Box sx={{ "& > div": { colorScheme: "light" } }}>
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
              />
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ flexGrow: 1, display: "flex" }}>
        <Container maxWidth="lg">{children}</Container>
      </Box>
    </Box>
  );
}
