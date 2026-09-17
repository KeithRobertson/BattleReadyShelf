import { notifications } from "@mantine/notifications";

/**
 * The one way an error message reaches the user.
 *
 * A notification rather than an in-page alert because a failure is usually triggered from inside a
 * modal, and anything rendered in the page itself sits behind the modal overlay, dimmed and
 * unreadable, while the form looks like nothing happened.
 *
 * The message doubles as the id, so a repeated failure replaces its own notification instead of
 * stacking up copies of the same complaint.
 *
 * API failures are already reported centrally by the interceptor in `auth/apiClient.ts` - call this
 * only for a failure the API layer cannot see, such as a file that will not parse or an upload that
 * goes straight to R2.
 */
export default function showErrorNotification(message: string): void {
  notifications.show({ id: message, message, color: "red", autoClose: 8000 });
}
