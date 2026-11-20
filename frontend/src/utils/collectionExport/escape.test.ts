import { describe, expect, it } from "vitest";
import { escapeHtml, escapeMarkdownInline } from "@/utils/collectionExport/escape";

describe("escapeHtml", () => {
  it("escapes angle brackets, ampersands and quotes", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
  });

  it("leaves plain text unchanged", () => {
    expect(escapeHtml("Death Guard")).toBe("Death Guard");
  });
});

describe("escapeMarkdownInline", () => {
  it("escapes heading markers and other Markdown control characters", () => {
    expect(escapeMarkdownInline("# Evil *bold* _em_ `code` [link](url)")).toBe(
      "\\# Evil \\*bold\\* \\_em\\_ \\`code\\` \\[link\\]\\(url\\)",
    );
  });

  it("collapses line breaks to spaces for single-line contexts", () => {
    expect(escapeMarkdownInline("line one\nline two\r\nline three")).toBe("line one line two line three");
  });
});
