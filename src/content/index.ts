// Proxy fetch requests from the background service worker through this content script's
// page context. This bypasses Cloudflare bot protection, which blocks direct service-worker
// fetches by detecting the missing same-origin headers and browser JS challenge state.
browser.runtime.onMessage.addListener(
  (message: unknown): Promise<{ ok: boolean; status: number; text: string }> | undefined => {
    const msg = message as { type?: string; url?: string };
    if (msg.type !== "proxyFetch" || !msg.url) return undefined;
    const url = msg.url;
    return fetch(url).then(async (response) => ({
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    }));
  },
);
