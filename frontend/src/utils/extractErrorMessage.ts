import { isAxiosError } from "axios";

/**
 * Pulls the backend's own error message out of a failed request, so users see "This wargear is
 * still in use" rather than a stringified Axios error.
 */
export default function extractErrorMessage(e: unknown): string {
  if (isAxiosError(e) && typeof e.response?.data?.message === "string") {
    return e.response.data.message;
  }
  return String(e);
}
