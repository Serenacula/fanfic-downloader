import type { FicData } from "../shared/types.js";
import type { Settings, DownloadFormat, RendererFn } from "../shared/settings.js";
import { getSettings } from "../shared/settings.js";
import { debugLog } from "../shared/logger.js";
import { detectParser } from "../parsers/index.js";
import { renderEpub } from "../renderers/epub.js";
import { renderHtml } from "../renderers/html.js";
import { renderMarkdown } from "../renderers/markdown.js";
import { renderTxt } from "../renderers/txt.js";
import { renderPdf } from "../renderers/pdf.js";
import { renderDocx } from "../renderers/docx.js";
import { formatFilename } from "../renderers/utils.js";

export type JobStatus =
  | "queued"
  | "fetching-metadata"
  | "fetching-chapters"
  | "rendering"
  | "saving"
  | "complete"
  | "failed"
  | "cancelled";

export interface DownloadJob {
  id: string;
  url: string;
  title: string | null;
  author: string | null;
  status: JobStatus;
  chaptersTotal: number | null;
  chaptersFetched: number;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  downloadId: number | null;
  overrides?: Partial<Settings> | undefined;
  dataOverrides?: DataOverrides | undefined;
}

export interface DataOverrides {
  title?: string;
  author?: string;
  tags?: string[];
}

export type OrchestratorMessage =
  | { type: "getJobs" }
  | {
      type: "startDownload";
      url: string;
      overrides?: Partial<Settings>;
      dataOverrides?: DataOverrides;
    }
  | {
      type: "startDownloadByUrl";
      url: string;
      overrides?: Partial<Settings>;
      dataOverrides?: DataOverrides;
    }
  | { type: "getPreviewMetadata"; url: string }
  | { type: "cancelJob"; id: string }
  | { type: "retryJob"; id: string }
  | { type: "openDownload"; id: string };

export type OrchestratorResponse =
  | { type: "jobs"; jobs: DownloadJob[] }
  | { type: "started"; id: string }
  | { type: "cancelled"; id: string }
  | { type: "retried"; id: string }
  | { type: "opened"; id: string }
  | { type: "previewMetadata"; title: string; author: string; tags: string[] }
  | { type: "error"; message: string }
  | { type: "validationError"; reason: "unsupported-site" | "invalid-url" };

const RENDERERS: Record<DownloadFormat, RendererFn> = {
  epub: renderEpub,
  html: renderHtml,
  markdown: renderMarkdown,
  txt: renderTxt,
  pdf: renderPdf,
  docx: renderDocx,
};

const FORMAT_EXTENSIONS: Record<DownloadFormat, string> = {
  epub: "epub",
  html: "html",
  markdown: "md",
  txt: "txt",
  pdf: "pdf",
  docx: "docx",
};

const SESSION_KEY = "downloadJobs";
let jobsCache: Record<string, DownloadJob> | null = null;
const cancelledJobs = new Set<string>();

// Each (re)start of a job bumps its generation; a runDownload holding an older
// generation is stale (its job was cancelled and retried while it was mid-await)
// and must stop touching the job instead of racing the newer run.
const jobGenerations = new Map<string, number>();

// Object URLs are revoked when the browser reports the download finished
// (revoking immediately can interrupt an in-flight download of a large blob);
// the timeout is a leak guard in case the state-change event never arrives.
const pendingObjectUrls = new Map<number, string>();
const OBJECT_URL_REVOKE_FALLBACK_MS = 10 * 60_000;

function bumpGeneration(id: string): number {
  const generation = (jobGenerations.get(id) ?? 0) + 1;
  jobGenerations.set(id, generation);
  return generation;
}

function revokePendingObjectUrl(downloadId: number): void {
  const objectUrl = pendingObjectUrls.get(downloadId);
  if (objectUrl === undefined) return;
  URL.revokeObjectURL(objectUrl);
  pendingObjectUrls.delete(downloadId);
}

// Test-only: clear module state that would otherwise leak between test cases.
export function resetOrchestratorStateForTests(): void {
  jobsCache = null;
  cancelledJobs.clear();
  jobGenerations.clear();
  pendingObjectUrls.clear();
}

function generateId(): string {
  return crypto.randomUUID();
}

function isJobRecord(value: unknown): value is Record<string, DownloadJob> {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value as Record<string, unknown>).every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).id === "string" &&
      typeof (item as Record<string, unknown>).status === "string",
  );
}

async function loadJobs(): Promise<Record<string, DownloadJob>> {
  if (jobsCache !== null) return jobsCache;
  const result = await browser.storage.session.get(SESSION_KEY);
  const stored = result[SESSION_KEY];
  jobsCache = isJobRecord(stored) ? stored : {};
  return jobsCache;
}

async function saveJob(job: DownloadJob): Promise<void> {
  const jobs = await loadJobs();
  jobs[job.id] = job;
  await browser.storage.session.set({ [SESSION_KEY]: jobs });
}

async function updateJob(id: string, patch: Partial<DownloadJob>): Promise<void> {
  const jobs = await loadJobs();
  const existing = jobs[id];
  if (!existing) return;
  jobs[id] = { ...existing, ...patch };
  await browser.storage.session.set({ [SESSION_KEY]: jobs });
}

export async function getJobs(): Promise<DownloadJob[]> {
  const jobs = await loadJobs();
  return Object.values(jobs).sort((a, b) => b.startedAt - a.startedAt);
}

export async function startDownload(
  url: string,
  overrides?: Partial<Settings>,
  dataOverrides?: DataOverrides,
): Promise<string> {
  const id = generateId();
  const job: DownloadJob = {
    id,
    url,
    title: null,
    author: null,
    status: "queued",
    chaptersTotal: null,
    chaptersFetched: 0,
    error: null,
    startedAt: Date.now(),
    completedAt: null,
    downloadId: null,
    overrides,
    dataOverrides,
  };
  await saveJob(job);
  void runDownload(id, url, bumpGeneration(id), overrides, dataOverrides);
  return id;
}

export async function cancelJob(id: string): Promise<void> {
  cancelledJobs.add(id);
  await updateJob(id, { status: "cancelled" });
}

export async function retryJob(id: string): Promise<void> {
  const jobs = await loadJobs();
  const job = jobs[id];
  if (!job) return;
  if (!["failed", "cancelled"].includes(job.status)) return;
  cancelledJobs.delete(id);
  await updateJob(id, {
    status: "queued",
    chaptersFetched: 0,
    error: null,
    startedAt: Date.now(),
    completedAt: null,
  });
  void runDownload(id, job.url, bumpGeneration(id), job.overrides, job.dataOverrides);
}

const INTERRUPTIBLE_STATUSES: readonly JobStatus[] = [
  "queued",
  "fetching-metadata",
  "fetching-chapters",
  "rendering",
  "saving",
];

// storage.session survives an event-page restart, so a job left in an active
// status is either stranded (the background died mid-download) or still running
// in THIS context (the background may have been woken BY the startDownload
// message that's driving it). jobGenerations only holds entries for runs started
// in this context, so it's the signal that distinguishes the two — a job without
// one is a leftover from a previous context and gets marked failed.
export async function recoverInterruptedJobs(): Promise<void> {
  const jobs = await loadJobs();
  const stranded = Object.values(jobs).filter(
    (job) => INTERRUPTIBLE_STATUSES.includes(job.status) && !jobGenerations.has(job.id),
  );
  await Promise.all(
    stranded.map((job) =>
      updateJob(job.id, {
        status: "failed",
        error: "Interrupted by an extension restart — click Retry to start again",
        completedAt: Date.now(),
      }),
    ),
  );
}

async function isCancelled(id: string): Promise<boolean> {
  if (cancelledJobs.has(id)) return true;
  const jobs = await loadJobs();
  return jobs[id]?.status === "cancelled";
}

async function isStale(id: string, generation: number): Promise<boolean> {
  if (jobGenerations.get(id) !== generation) return true;
  return isCancelled(id);
}

async function runDownload(
  id: string,
  url: string,
  generation: number,
  overrides?: Partial<Settings>,
  dataOverrides?: DataOverrides,
): Promise<void> {
  try {
    debugLog(`starting download job=${id} url=${url}`);
    const settings = { ...(await getSettings()), ...overrides };
    const parser = detectParser(url);
    if (!parser) throw new Error(`Unsupported site: ${url}`);

    await updateJob(id, {
      status: "fetching-metadata",
      chaptersTotal: null,
      chaptersFetched: 0,
    });
    if (await isStale(id, generation)) return;

    debugLog(`calling parser for ${url}`);
    const onProgress = (fetched: number, total: number) => {
      if (jobGenerations.get(id) !== generation) return;
      void updateJob(id, {
        status: "fetching-chapters",
        chaptersFetched: fetched,
        chaptersTotal: total,
      });
    };
    const parsed: FicData = await parser.parse(url, settings, onProgress);
    debugLog(
      `parser returned: title="${parsed.core.title}" chapters=${parsed.core.chapters.length}`,
    );
    const ficData: FicData = dataOverrides
      ? {
          ...parsed,
          core: {
            ...parsed.core,
            title: dataOverrides.title ?? parsed.core.title,
            author: dataOverrides.author ?? parsed.core.author,
            tags: dataOverrides.tags ?? parsed.core.tags,
          },
        }
      : parsed;
    if (await isStale(id, generation)) return;

    await updateJob(id, {
      title: ficData.core.title,
      author: ficData.core.author,
      status: "rendering",
      chaptersTotal: ficData.core.chapters.length,
      chaptersFetched: ficData.core.chapters.length,
    });

    const renderer = RENDERERS[settings.format];
    const blob = await renderer(ficData, settings);
    debugLog(`rendered ${settings.format}: ${blob.size} bytes, type="${blob.type}"`);

    if (await isStale(id, generation)) return;
    await updateJob(id, { status: "saving" });

    const isZip =
      blob.type === "application/zip" || (settings.chapterSplit && settings.format !== "epub");
    const extension = isZip ? "zip" : FORMAT_EXTENSIONS[settings.format];
    const baseName = formatFilename(settings.filenameTemplate, ficData);
    const filename = `${baseName}.${extension}`;

    const objectUrl = URL.createObjectURL(blob);
    debugLog(`downloading as "${filename}" from ${objectUrl}`);
    let downloadId: number;
    try {
      downloadId = await browser.downloads.download({
        url: objectUrl,
        filename,
        saveAs: false,
      });
    } catch (downloadError) {
      URL.revokeObjectURL(objectUrl);
      throw downloadError;
    }
    debugLog(`download initiated, id=${downloadId}`);
    pendingObjectUrls.set(downloadId, objectUrl);
    setTimeout(() => revokePendingObjectUrl(downloadId), OBJECT_URL_REVOKE_FALLBACK_MS);

    await updateJob(id, {
      status: "complete",
      completedAt: Date.now(),
      downloadId,
    });
    await notifyCompletion(ficData.core.title, true);
  } catch (error) {
    if (!(await isStale(id, generation))) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fanfic-downloader] download failed for job ${id}:`, error);
      await updateJob(id, {
        status: "failed",
        error: message,
        completedAt: Date.now(),
      });
      const jobs = await loadJobs();
      const failedTitle = jobs[id]?.title ?? url;
      await notifyCompletion(failedTitle, false);
    }
  }
}

async function notifyCompletion(title: string, success: boolean): Promise<void> {
  // Icon badge
  await browser.action.setBadgeText({ text: success ? "✓" : "!" });
  await browser.action.setBadgeBackgroundColor({
    color: success ? "#7ecf7e" : "#e07070",
  });

  // Page toast — inject into active tab
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id == null) return;

    const message = success ? `Download complete: ${title}` : `Download failed: ${title}`;

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectToast,
      args: [message, success],
    });
  } catch {
    // Tab may not support content scripts — silently ignore
  }
}

function injectToast(message: string, success: boolean): void {
  const existing = document.getElementById("fanfic-downloader-toast");
  existing?.remove();

  const toast = document.createElement("div");
  toast.id = "fanfic-downloader-toast";
  const shadow = toast.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: ${success ? "#2a4a2a" : "#4a2a2a"};
      color: ${success ? "#a0e0a0" : "#e0a0a0"};
      border: 1px solid ${success ? "#5a9a5a" : "#9a5a5a"};
      border-radius: 6px;
      padding: 10px 16px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: fadein 0.2s ease;
    }
    @keyframes fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
  `;
  const span = document.createElement("span");
  span.textContent = message;

  shadow.appendChild(style);
  shadow.appendChild(span);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

export function startDownloadByUrl(
  url: string,
  overrides?: Partial<Settings>,
): Promise<OrchestratorResponse> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return Promise.resolve({
      type: "validationError" as const,
      reason: "invalid-url" as const,
    });
  }

  if (!detectParser(parsed.href)) {
    return Promise.resolve({
      type: "validationError" as const,
      reason: "unsupported-site" as const,
    });
  }

  return startDownload(url, overrides).then((id) => ({
    type: "started" as const,
    id,
  }));
}

export async function handleMessage(message: OrchestratorMessage): Promise<OrchestratorResponse> {
  switch (message.type) {
    case "getJobs":
      return getJobs().then((jobs) => ({ type: "jobs" as const, jobs }));

    case "startDownload":
      return startDownload(message.url, message.overrides, message.dataOverrides).then((id) => ({
        type: "started" as const,
        id,
      }));

    case "startDownloadByUrl":
      return startDownloadByUrl(message.url, message.overrides);

    case "cancelJob":
      return cancelJob(message.id).then(() => ({
        type: "cancelled" as const,
        id: message.id,
      }));

    case "retryJob":
      return retryJob(message.id).then(() => ({
        type: "retried" as const,
        id: message.id,
      }));

    case "openDownload": {
      const jobs = await loadJobs();
      const job = jobs[message.id];
      if (job?.downloadId != null) {
        await browser.downloads.show(job.downloadId);
      }
      return { type: "opened" as const, id: message.id };
    }

    case "getPreviewMetadata": {
      try {
        const parser = detectParser(message.url);
        if (!parser)
          return {
            type: "error" as const,
            message: "Unsupported site",
          };
        const settings = await getSettings();
        const data = await parser.parse(message.url, {
          ...settings,
          includeImages: false,
        });
        return {
          type: "previewMetadata" as const,
          title: data.core.title,
          author: data.core.author,
          tags: data.core.tags,
        };
      } catch (error) {
        return {
          type: "error" as const,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }

    default:
      return Promise.resolve({
        type: "error" as const,
        message: "Unknown message type",
      });
  }
}

export function handleDownloadChange(delta: {
  id: number;
  state?: { current?: string | undefined } | undefined;
}): void {
  const state = delta.state?.current;
  debugLog(`download ${delta.id} state: ${state ?? "(unchanged)"}`);

  if (state === "complete" || state === "interrupted") {
    revokePendingObjectUrl(delta.id);
  }

  if (state === "interrupted") {
    void (async () => {
      try {
        const jobs = await loadJobs();
        const job = Object.values(jobs).find((job) => job.downloadId === delta.id);
        if (job && job.status === "complete") {
          debugLog(`marking job ${job.id} as failed due to interrupted download`);
          await updateJob(job.id, {
            status: "failed",
            error: "Download was interrupted",
            completedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error("[fanfic-downloader] handleDownloadChange error:", error);
      }
    })();
  }
}
