import { type AxiosError, isAxiosError } from "axios";
import { publishApiError } from "@/auth/apiErrorEvents";
import { endSession, getStoredToken } from "@/auth/tokenStorage";
import { getCurrentUser } from "@/generated";
import { client } from "@/generated/client.gen";
import extractErrorMessage from "@/utils/extractErrorMessage";

const SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again.";

/** Marks the token check below, so its own failures never come back round as errors to report. */
const SESSION_CHECK_HEADER = "X-Session-Check";

// Attach the JWT (if present) to every request made via the generated API client.
client.instance.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function requestUrl(error: AxiosError): string {
  return error.config?.url ?? "";
}

function isSessionCheck(error: AxiosError): boolean {
  return Boolean(error.config?.headers?.[SESSION_CHECK_HEADER]);
}

/** AuthContext owns the session-restore call, including deciding a 401 means the token is dead. */
function isSessionRestore(error: AxiosError): boolean {
  return error.config?.method?.toLowerCase() === "get" && /\/users\/me\/?(\?|$)/.test(requestUrl(error));
}

function isGoogleLogin(error: AxiosError): boolean {
  return /\/auth\/google\/?(\?|$)/.test(requestUrl(error));
}

let sessionCheck: Promise<boolean> | null = null;

/**
 * Asks the server whether the stored token is still accepted, sharing one answer between everything
 * that failed at the same time so a page full of requests does not ask once per request.
 */
function isSessionStillValid(): Promise<boolean> {
  sessionCheck ??= getCurrentUser({ throwOnError: true, headers: { [SESSION_CHECK_HEADER]: "1" } })
    .then(() => true)
    .catch((error: unknown) => !(isAxiosError(error) && error.response?.status === 401))
    .finally(() => {
      sessionCheck = null;
    });
  return sessionCheck;
}

/**
 * Decides what an unauthorized response means for a signed-in user. Almost always an expired token,
 * but confirming costs one request and keeps a one-off from throwing the session away.
 */
async function resolveUnauthorized(error: AxiosError): Promise<void> {
  if (await isSessionStillValid()) {
    publishApiError(extractErrorMessage(error));
    return;
  }
  endSession();
  publishApiError(SESSION_EXPIRED_MESSAGE);
}

/**
 * Reports a failed request to the user. An API error is a message, never a logout - the one
 * exception being a token the server has confirmed it no longer accepts.
 */
function reportFailure(error: unknown): void {
  if (!isAxiosError(error) || error.code === "ERR_CANCELED") return;
  if (isSessionCheck(error)) return;

  if (error.response?.status !== 401) {
    publishApiError(extractErrorMessage(error));
    return;
  }

  if (isSessionRestore(error)) return;

  if (getStoredToken()) {
    void resolveUnauthorized(error);
  } else if (isGoogleLogin(error)) {
    // Every other 401 without a token is a protected route doing its job to a signed-out visitor,
    // which is expected rather than something to interrupt them about.
    publishApiError(extractErrorMessage(error));
  }
}

client.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    reportFailure(error);
    return Promise.reject(error);
  },
);

export const apiClient = client.instance;
