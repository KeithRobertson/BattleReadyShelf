import { useEffect } from "react";
import { subscribeApiErrors } from "@/auth/apiErrorEvents";
import showErrorNotification from "@/utils/showErrorNotification";

/** Shows every API failure reported by the interceptor in `auth/apiClient.ts` to the user. */
export function useApiErrorNotifications(): void {
  useEffect(() => subscribeApiErrors(showErrorNotification), []);
}
