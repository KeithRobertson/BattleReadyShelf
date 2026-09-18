export const PENDING_CHANGES_ELEMENT_ID = "pending-changes";
export const OPEN_DRAFTS_ELEMENT_ID = "open-drafts";

export function scrollToElementId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
