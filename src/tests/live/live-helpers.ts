import type { TestContext } from "vitest";

// Statuses/messages shaped like a Cloudflare challenge or block. Live tests run
// from whatever IP CI or the developer machine has — datacenter IPs get walled
// far more often than a real browser would, so these are expected, not failures.
const BLOCKED_PATTERN = /HTTP 403|HTTP 429|HTTP 503|tab open|Cloudflare/;

export function skipIfBlocked(error: unknown, ctx: TestContext): never {
  const message = error instanceof Error ? error.message : String(error);
  if (BLOCKED_PATTERN.test(message)) {
    console.warn(`[live-test] skipping "${ctx.task.name}": ${message}`);
    ctx.skip(message);
  }
  throw error;
}
