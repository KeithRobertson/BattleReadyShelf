import type { AuthResponse, UserDto } from "../generated";
import { authenticateWithGoogle, getCurrentUser } from "../generated";

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
