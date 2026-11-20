/** Escape text for HTML element / attribute content. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Characters that change Markdown meaning in headings / list items / emphasis. */
const MARKDOWN_INLINE_SPECIAL = /([\\`*_{}[\]()#])/g;

/**
 * Escape Markdown control characters and collapse line breaks for single-line contexts
 * (headings, list items).
 */
export function escapeMarkdownInline(text: string): string {
  return text.replaceAll(/\r\n|\r|\n/g, " ").replace(MARKDOWN_INLINE_SPECIAL, "\\$1");
}
