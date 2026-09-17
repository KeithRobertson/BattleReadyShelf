import { type AxiosAdapter, AxiosError, type AxiosResponse, CanceledError } from "axios";
import { apiClient } from "@/auth/apiClient";

export type StubbedReply = Readonly<{ status: number; body?: unknown }>;

export type StubbedRequest = Readonly<{ method: string; url: string }>;

/**
 * Answers requests from the generated API client without a network, so a test can drive the app by
 * status code. Swapping axios' adapter rather than mocking the SDK means the request/response
 * interceptors in `auth/apiClient` still run, which is the behaviour usually under test.
 *
 * Keys are matched as substrings of the request URL: "/users/me" covers the one route, "/api/v1"
 * covers everything.
 *
 * Returns a live log of the requests that were made, for assertions about what the app asked for.
 */
export function stubApi(replies: Readonly<Record<string, StubbedReply>>): StubbedRequest[] {
  const requests: StubbedRequest[] = [];

  stubApiWith(async (config) => {
    const url = config.url ?? "";
    requests.push({ method: config.method?.toUpperCase() ?? "GET", url });

    const reply = Object.entries(replies).find(([route]) => url.includes(route))?.[1];
    if (!reply) {
      throw new Error(`No stubbed reply for ${config.method?.toUpperCase()} ${url}`);
    }

    const response: AxiosResponse = {
      data: reply.body ?? null,
      status: reply.status,
      statusText: String(reply.status),
      headers: {},
      config,
    };

    // Axios applies `validateStatus` inside its built-in adapters, so a replacement adapter has to
    // reject error statuses itself or a 500 reaches the caller as a success.
    if (reply.status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${reply.status}`,
        AxiosError.ERR_BAD_RESPONSE,
        config,
        null,
        response,
      );
    }
    return response;
  });

  return requests;
}

/** Lower-level {@link stubApi} for failures axios models as something other than a status code. */
export function stubApiWith(adapter: AxiosAdapter): void {
  apiClient.defaults.adapter = adapter;
}

/** Fails every request the way an aborted one fails, e.g. a component unmounting mid-flight. */
export function stubApiAsAborted(): void {
  stubApiWith(async (config) => {
    throw new CanceledError(undefined, config);
  });
}

/** Fails every request the way a dropped connection does: no response, so no status to read. */
export function stubApiAsUnreachable(): void {
  stubApiWith(async (config) => {
    throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
  });
}

export function resetApiStubs(): void {
  apiClient.defaults.adapter = undefined;
}
