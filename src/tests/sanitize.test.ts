import { describe, it, expect, vi } from "vitest";

vi.mock("../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { sanitizeHtml } = await import("../parsers/common.js");

describe("sanitizeHtml — XSS prevention", () => {
  it("strips script tags and preserves surrounding content", () => {
    const result = sanitizeHtml('<p>before</p><script>alert(1)</script><p>after</p>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("before");
    expect(result).toContain("after");
  });

  it("strips event handler attributes from allowed tags", () => {
    const result = sanitizeHtml('<p onclick="alert(1)" onmouseover="evil()">text</p>');
    expect(result).not.toContain("onclick");
    expect(result).not.toContain("onmouseover");
    expect(result).toContain("<p>text</p>");
  });

  it("strips onerror on img even when src is valid", () => {
    const result = sanitizeHtml('<img src="https://example.com/img.png" onerror="alert(1)"/>');
    expect(result).not.toContain("onerror");
    expect(result).toContain('src="https://example.com/img.png"');
  });

  it("strips javascript: href and preserves link text", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">click me</a>');
    expect(result).not.toContain("javascript:");
    expect(result).toContain("click me");
  });

  it("strips data: href", () => {
    const result = sanitizeHtml('<a href="data:text/html,<script>x</script>">x</a>');
    expect(result).not.toContain("data:");
  });

  it("strips vbscript: href", () => {
    const result = sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>');
    expect(result).not.toContain("vbscript:");
  });

  it("strips base64 data: src from img", () => {
    const result = sanitizeHtml('<p>text</p><img src="data:image/png;base64,abc123" alt="img"/>');
    expect(result).not.toContain("<img");
    expect(result).toContain("text");
  });

  it("sanitizes nested content recursively", () => {
    const result = sanitizeHtml('<blockquote><p onclick="x()"><em>text</em></p></blockquote>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("<em>text</em>");
  });
});

describe("sanitizeHtml — allowed content passes through", () => {
  it("preserves https: href", () => {
    expect(sanitizeHtml('<a href="https://example.com">link</a>')).toContain('href="https://example.com"');
  });

  it("preserves http: href", () => {
    expect(sanitizeHtml('<a href="http://example.com">link</a>')).toContain('href="http://example.com"');
  });

  it("preserves root-relative href", () => {
    expect(sanitizeHtml('<a href="/chapter/2">link</a>')).toContain('href="/chapter/2"');
  });

  it("preserves fragment href", () => {
    expect(sanitizeHtml('<a href="#section">link</a>')).toContain('href="#section"');
  });

  it("preserves img with valid https src", () => {
    const result = sanitizeHtml('<img src="https://example.com/image.png" alt="test"/>');
    expect(result).toContain('src="https://example.com/image.png"');
  });

  it("preserves allowed formatting tags", () => {
    const result = sanitizeHtml('<p><strong>bold</strong> and <em>italic</em></p>');
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("preserves blockquote, headings, and lists", () => {
    const result = sanitizeHtml('<h2>Title</h2><blockquote><ul><li>item</li></ul></blockquote>');
    expect(result).toContain("<h2>Title</h2>");
    expect(result).toContain("<li>item</li>");
    expect(result).toContain("<blockquote>");
  });
});

describe("sanitizeHtml — tag and attribute handling", () => {
  it("unwraps unknown tags but preserves their text content", () => {
    const result = sanitizeHtml('<p><x-custom>visible text</x-custom></p>');
    expect(result).toContain("visible text");
    expect(result).not.toContain("<x-custom>");
  });

  it("strips class and style attributes from allowed tags", () => {
    const result = sanitizeHtml('<p class="story" style="font-size:2em">text</p>');
    expect(result).not.toContain("class=");
    expect(result).not.toContain("style=");
    expect(result).toContain("<p>text</p>");
  });

  it("strips img with no src attribute", () => {
    const result = sanitizeHtml('<p>text</p><img alt="no src"/>');
    expect(result).not.toContain("<img");
    expect(result).toContain("text");
  });

  it("strips disallowed attributes but keeps allowed ones on img", () => {
    const result = sanitizeHtml('<img src="https://x.com/img.png" alt="desc" class="big" data-id="1"/>');
    expect(result).toContain('alt="desc"');
    expect(result).not.toContain("class=");
    expect(result).not.toContain("data-id=");
  });

  it("preserves title attribute on anchor", () => {
    const result = sanitizeHtml('<a href="https://example.com" title="My Link">link</a>');
    expect(result).toContain('title="My Link"');
  });
});
