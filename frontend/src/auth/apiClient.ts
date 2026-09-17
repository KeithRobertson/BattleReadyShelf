import { isAxiosError } from "axios";
import { publishApiError } from "@/auth/apiErrorEvents";
import { getStoredToken } from "@/auth/tokenStorage";
import { client } from "@/generated/client.gen";
import extractErrorMessage from "@/utils/extractErrorMessage";

// Attach the JWT (if present) to every request made via the generated API client.
client.instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isCanceled(error: unknown): boolean {
  return isAxiosError(error) && error.code === "ERR_CANCELED";
}

function requestUrl(error: unknown): string {
  return isAxiosError(error) ? (error.config?.url ?? "") : "";
}

/** Session restore uses GET /users/me; a 401 there is handled by AuthContext, not the banner. */
function isSessionRestoreUnauthorized(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 401) {
    return false;
  }
  const method = error.config?.method?.toLowerCase();
  return method === "get" && /\/users\/me\/?(\?|$)/.test(requestUrl(error));
}

function isGoogleLoginFailure(error: unknown): boolean {
  return isAxiosError(error) && /\/auth\/google\/?(\?|$)/.test(requestUrl(error));
}

function shouldPresentApiError(error: unknown): boolean {
  if (isCanceled(error) || isSessionRestoreUnauthorized(error)) {
    return false;
  }
  // Signed-out 401s are expected on protected routes; don't nag. Login failures still show.
  if (isAxiosError(error) && error.response?.status === 401 && !getStoredToken() && !isGoogleLoginFailure(error)) {
    return false;
  }
  return true;
}

// Keep the session on API failures. Business errors (and even most 401s mid-session) should
// surface as messages rather than kicking the user back to the login button.
client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldPresentApiError(error)) {
      publishApiError(extractErrorMessage(error));
    }
    return Promise.reject(error);
  },
);

export const apiClient = client.instance;
