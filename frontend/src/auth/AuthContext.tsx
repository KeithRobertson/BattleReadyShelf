import { useMantineColorScheme } from "@mantine/core";
import { googleLogout } from "@react-oauth/google";
import { isAxiosError } from "axios";
import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { type CurrentUser, fetchCurrentUser, loginWithGoogle, updateThemePreference } from "@/auth/authApi";
import { getStoredToken, setStoredToken } from "@/auth/tokenStorage";
import type { ThemePreference } from "@/generated";

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

export type AuthProviderProps = Readonly<{ children: ReactNode }>;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch((error: unknown) => {
        // Only drop a stored token when the server actually rejected it. A blip
        // (network / 5xx) must not sign the user out.
        if (isAxiosError(error) && error.response?.status === 401) {
          setStoredToken(null);
        }
      })
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
