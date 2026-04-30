import { getSettings } from "../shared/settings.js";

const MAX_RETRIES = 3;

type QueueEntry = {
  url: string;
  init: RequestInit | undefined;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
  retryCount: number;
};

export type RequestQueue = {
  enqueue: (url: string, init?: RequestInit) => Promise<Response>;
};

export function createQueue(): RequestQueue {
  let inFlight = 0;
  let lastDispatchTime = 0;
  let draining = false;
  const pending: QueueEntry[] = [];

  async function dispatch(entry: QueueEntry): Promise<void> {
    try {
      const response = await fetch(entry.url, entry.init);
      if (!response.ok) {
        if (entry.retryCount < MAX_RETRIES) {
          scheduleRetry(entry);
          return;
        }
        entry.reject(new Error(`Request failed after ${MAX_RETRIES} retries: ${entry.url}`));
        return;
      }
      entry.resolve(response);
    } catch {
      if (entry.retryCount < MAX_RETRIES) {
        scheduleRetry(entry);
        return;
      }
      entry.reject(new Error(`Request failed after ${MAX_RETRIES} retries: ${entry.url}`));
    } finally {
      inFlight--;
      void drain();
    }
  }

  function scheduleRetry(entry: QueueEntry): void {
    const delayMs = (entry.retryCount + 1) * 1000;
    entry.retryCount++;
    inFlight--;
    setTimeout(() => {
      pending.unshift(entry);
      void drain();
    }, delayMs);
  }

  async function drain(): Promise<void> {
    if (draining || pending.length === 0) return;
    draining = true;

    try {
      const settings = await getSettings();
      const limit = settings.maxConcurrentDownloads === 0 ? Infinity : settings.maxConcurrentDownloads;

      if (inFlight >= limit) return;

      while (pending.length > 0 && inFlight < limit) {
        const now = Date.now();
        const elapsed = now - lastDispatchTime;
        const waitMs = Math.max(0, settings.rateLimitMs - elapsed);

        if (waitMs > 0) {
          setTimeout(() => void drain(), waitMs);
          return;
        }

        const entry = pending.shift();
        if (!entry) break;
        lastDispatchTime = Date.now();
        inFlight++;
        void dispatch(entry);
      }
    } finally {
      draining = false;
    }
  }

  return {
    enqueue(url: string, init?: RequestInit): Promise<Response> {
      return new Promise((resolve, reject) => {
        pending.push({ url, init, resolve, reject, retryCount: 0 });
        void drain();
      });
    },
  };
}

export const requestQueue: RequestQueue = createQueue();

export function enqueue(url: string, init?: RequestInit): Promise<Response> {
  return requestQueue.enqueue(url, init);
}
