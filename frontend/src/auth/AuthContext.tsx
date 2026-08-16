import { useMantineColorScheme } from "@mantine/core";
import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ThemePreference } from "../generated";
import { type CurrentUser, fetchCurrentUser, loginWithGoogle, updateThemePreference } from "./authApi";
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from "./tokenStorage";
import { googleLogout } from '@react-oauth/google';

export type AuthContextValue = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  /** True while the initial session restore (from a stored token) is in progress. */
  isLoading: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  logout: () => void;
  /** Persists the user's preferred theme server-side and applies it immediately. */
  setThemePreference: (themePreference: ThemePreference) => Promise<void>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    // If any API call is rejected as unauthorized (expired/invalid token), make
    // sure our in-memory user state is cleared too, not just the stored token.
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setStoredToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Apply the user's saved theme preference (from the database) whenever it becomes known/changes,
  // so it follows them across devices/browsers rather than relying on a per-browser default.
  useEffect(() => {
    if (user?.themePreference) {
      setColorScheme(user.themePreference.toLowerCase() as "light" | "dark" | "auto");
    }
  }, [user?.themePreference, setColorScheme]);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const { token, user: loggedInUser } = await loginWithGoogle(idToken);
    setStoredToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    googleLogout();
  }, []);

  const setThemePreference = useCallback(async (themePreference: ThemePreference) => {
    const updatedUser = await updateThemePreference(themePreference);
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      loginWithGoogleIdToken,
      logout,
      setThemePreference,
    }),
    [user, isLoading, loginWithGoogleIdToken, logout, setThemePreference],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
