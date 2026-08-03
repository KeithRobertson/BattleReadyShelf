const TOKEN_STORAGE_KEY = "brs_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Lets the API layer notify AuthContext when a request is rejected as
// unauthorized (e.g. an expired/invalid token), so the in-memory `user`
// state doesn't stay stale after the stored token has been cleared.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function clearTokenDueToUnauthorized(): void {
  setStoredToken(null);
  unauthorizedHandler?.();
}
