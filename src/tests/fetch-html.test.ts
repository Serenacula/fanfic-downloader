import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../background/request-queue.js");
const { fetchHtml } = await import("../parsers/common.js");

const PAGE_URL = "https://example.com/story/1";

function htmlResponse(html: string): Response {
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
}

function openTab(): void {
  vi.spyOn(browser.tabs, "query").mockResolvedValue([{ id: 1, discarded: false }] as never);
  vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue({
    ok: true,
    status: 200,
    text: "<html><body><p>proxied page</p></body></html>",
  } as never);
}

function noTab(): void {
  vi.spyOn(browser.tabs, "query").mockResolvedValue([] as never);
}

describe("fetchHtml — direct fetch first", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the direct response without consulting the proxy", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      htmlResponse("<html><body><p>direct page</p></body></html>"),
    );
    const querySpy = vi.spyOn(browser.tabs, "query");

    const doc = await fetchHtml(PAGE_URL);

    expect(doc.body.textContent).toContain("direct page");
    expect(querySpy).not.toHaveBeenCalled();
  });
});

describe("fetchHtml — non-Cloudflare failures are not proxied", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("rethrows a 404 directly instead of trying the proxy", async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error(`Request failed: ${PAGE_URL} (HTTP 404)`));
    const querySpy = vi.spyOn(browser.tabs, "query");

    await expect(fetchHtml(PAGE_URL)).rejects.toThrow("HTTP 404");
    expect(querySpy).not.toHaveBeenCalled();
  });

  it("does not mask a 404 with a 'no tab open' proxy error", async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error(`Request failed: ${PAGE_URL} (HTTP 404)`));
    noTab();

    await expect(fetchHtml(PAGE_URL)).rejects.not.toThrow(/tab open/);
  });
});

describe("fetchHtml — Cloudflare-shaped failures fall back to the proxy", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("proxies after an HTTP 403", async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error(`Request failed: ${PAGE_URL} (HTTP 403)`));
    openTab();

    const doc = await fetchHtml(PAGE_URL);
    expect(doc.body.textContent).toContain("proxied page");
  });

  it("proxies after an HTTP 503", async () => {
    vi.mocked(enqueue).mockRejectedValue(
      new Error(`Request failed after 3 retries: ${PAGE_URL} — HTTP 503`),
    );
    openTab();

    const doc = await fetchHtml(PAGE_URL);
    expect(doc.body.textContent).toContain("proxied page");
  });

  it("proxies after a network-level failure with no HTTP status", async () => {
    vi.mocked(enqueue).mockRejectedValue(
      new Error(`Request failed after 3 retries: ${PAGE_URL} — Failed to fetch`),
    );
    openTab();

    const doc = await fetchHtml(PAGE_URL);
    expect(doc.body.textContent).toContain("proxied page");
  });

  it("includes both the proxy and the direct failure when both paths fail", async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error(`Request failed: ${PAGE_URL} (HTTP 403)`));
    noTab();

    await expect(fetchHtml(PAGE_URL)).rejects.toThrow(
      /No example\.com tab open.*direct fetch failed:.*HTTP 403/,
    );
  });
});
