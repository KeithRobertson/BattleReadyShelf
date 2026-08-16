import type { AuthResponse, ThemePreference, UserDto } from "../generated";
import { authenticateWithGoogle, getCurrentUser, updateMyThemePreference } from "../generated";

export type CurrentUser = UserDto;

/**
 * Exchanges a Google ID token for our own JWT + user profile.
 * See POST /api/v1/auth/google.
 */
export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const response = await authenticateWithGoogle({ body: { idToken }, throwOnError: true });
  return response.data;
}

/** Fetches the currently authenticated user. See GET /api/v1/users/me. */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await getCurrentUser({ throwOnError: true });
  return response.data;
}

/** Persists the current user's theme preference. See PATCH /api/v1/users/me/theme-preference. */
export async function updateThemePreference(themePreference: ThemePreference): Promise<CurrentUser> {
  const response = await updateMyThemePreference({ body: { themePreference }, throwOnError: true });
  return response.data;
}
