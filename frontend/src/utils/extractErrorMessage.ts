import { isAxiosError } from "axios";

/**
 * Pulls the backend's own error message out of a failed request, so users see "This wargear is
 * still in use" rather than a stringified Axios error.
 */
export default function extractErrorMessage(e: unknown): string {
  if (isAxiosError(e)) {
    if (typeof e.response?.data?.message === "string") {
      return e.response.data.message;
    }
    // No response at all means the request never landed, which "AxiosError: Network Error" says
    // without telling the user anything they can act on.
    if (!e.response) {
      return "Could not reach the server. Check your connection and try again.";
    }
  }
  return String(e);
}
