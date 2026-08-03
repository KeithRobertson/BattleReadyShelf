import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { type CurrentUser, fetchCurrentUser, loginWithGoogle } from "./authApi";
import { getStoredToken, setStoredToken, setUnauthorizedHandler } from "./tokenStorage";

export type AuthContextValue = {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  /** True while the initial session restore (from a stored token) is in progress. */
  isLoading: boolean;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  logout: () => void;
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const { token, user: loggedInUser } = await loginWithGoogle(idToken);
    setStoredToken(token);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, loginWithGoogleIdToken, logout }),
    [user, isLoading, loginWithGoogleIdToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
