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

// Lets the API layer end the session once it has established that the server is rejecting the
// stored token, so the in-memory `user` in AuthContext does not stay behind rendering a signed-in
// header for a session that no longer exists.
let sessionEndedHandler: (() => void) | null = null;

export function setSessionEndedHandler(handler: (() => void) | null): void {
  sessionEndedHandler = handler;
}

/**
 * Ends the session. Reserved for a token the server has actually rejected: an API call failing for
 * any other reason must leave the session alone.
 */
export function endSession(): void {
  setStoredToken(null);
  sessionEndedHandler?.();
}
