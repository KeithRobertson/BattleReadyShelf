import axios, { AxiosError, type AxiosResponse, CanceledError, type InternalAxiosRequestConfig } from "axios";
import { apiClient } from "@/auth/apiClient";
import { type ApiFault, findFault, getFaults } from "@/dev/apiFaults";

/**
 * Answers matching requests from the fault rules instead of the backend.
 *
 * Reachable only through the dynamic import in `main.tsx` - see the note at the top of `apiFaults.ts`
 * for why a static import of anything in this folder would ship it to production.
 *
 * This replaces axios' adapter rather than adding an interceptor, so everything the app does with a
 * response still happens: the interceptors in `auth/apiClient` see a faulted request exactly as they
 * would a real failure, which is the whole point of being able to cause one. It is the same trick
 * `testing/stubApi.ts` uses, for the same reason.
 */
export function installApiFaults(): void {
  const network = axios.getAdapter(apiClient.defaults.adapter ?? axios.defaults.adapter);

  apiClient.defaults.adapter = async (config) => {
    const fault = findFault(getFaults(), config.method ?? "get", requestUrl(config));
    if (!fault) return network(config);

    if (fault.delayMs > 0) await hold(fault.delayMs, config);
    if (fault.kind === "delay") return network(config);

    if (fault.kind === "network") {
      throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
    }

    return answer(fault, config);
  };
}

function answer(fault: ApiFault, config: InternalAxiosRequestConfig): AxiosResponse {
  const status = fault.kind === "body" ? 200 : fault.status;
  const response: AxiosResponse = {
    data: fault.kind === "body" ? parseBody(fault.body) : { message: fault.message },
    status,
    statusText: String(status),
    headers: {},
    config,
  };

  // Axios applies `validateStatus` inside its own adapters, so a replacement has to reject error
  // statuses itself or a 500 reaches the caller as a success.
  if (status >= 400) {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    );
  }
  return response;
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    console.warn("[dev] fault body is not valid JSON, answering with null instead");
    return null;
  }
}

function requestUrl(config: InternalAxiosRequestConfig): string {
  const path = config.url ?? "";
  if (!config.baseURL) return path;
  try {
    return new URL(path, config.baseURL).href;
  } catch {
    return path;
  }
}

/**
 * Holds a request, while still letting go of it if the caller aborts - components abort on unmount,
 * and a delay that ignored that would invent behaviour the real network does not have.
 */
function hold(ms: number, config: InternalAxiosRequestConfig): Promise<void> {
  const { signal } = config;

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new CanceledError(undefined, config));
      return;
    }

    const onAbort = () => {
      clearTimeout(timer);
      reject(new CanceledError(undefined, config));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener?.("abort", onAbort);
  });
}
