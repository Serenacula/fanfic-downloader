import type { FicData } from "../shared/types.js";
import type { Settings, DownloadFormat, RendererFn } from "../shared/settings.js";
import { getSettings } from "../shared/settings.js";
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
}

export interface DataOverrides {
  title?: string;
  author?: string;
  tags?: string[];
}

export type OrchestratorMessage =
  | { type: "getJobs" }
  | { type: "startDownload"; url: string; overrides?: Partial<Settings>; dataOverrides?: DataOverrides }
  | { type: "startDownloadByUrl"; url: string; overrides?: Partial<Settings>; dataOverrides?: DataOverrides }
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
const cancelledJobs = new Set<string>();
const pendingObjectUrls = new Map<number, string>();

function generateId(): string {
  return crypto.randomUUID();
}

async function loadJobs(): Promise<Record<string, DownloadJob>> {
  const result = await browser.storage.session.get(SESSION_KEY);
  const stored = result[SESSION_KEY];
  if (stored == null || typeof stored !== "object") return {};
  return stored as Record<string, DownloadJob>;
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
  };
  await saveJob(job);
  void runDownload(id, url, overrides, dataOverrides);
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
  cancelledJobs.delete(id);
  await updateJob(id, {
    status: "queued",
    chaptersFetched: 0,
    error: null,
    startedAt: Date.now(),
    completedAt: null,
  });
  void runDownload(id, job.url);
}

function isCancelled(id: string): boolean {
  return cancelledJobs.has(id);
}

async function runDownload(id: string, url: string, overrides?: Partial<Settings>, dataOverrides?: DataOverrides): Promise<void> {
  try {
    const settings = { ...(await getSettings()), ...overrides };
    const parser = detectParser(url);
    if (!parser) throw new Error(`Unsupported site: ${url}`);

    await updateJob(id, { status: "fetching-metadata" });
    if (isCancelled(id)) return;

    const parsed: FicData = await parser.parse(url, settings);
    const ficData: FicData = dataOverrides
      ? { ...parsed, core: { ...parsed.core, title: dataOverrides.title ?? parsed.core.title, author: dataOverrides.author ?? parsed.core.author, tags: dataOverrides.tags ?? parsed.core.tags } }
      : parsed;
    if (isCancelled(id)) return;

    await updateJob(id, {
      title: ficData.core.title,
      author: ficData.core.author,
      status: "fetching-chapters",
      chaptersTotal: ficData.core.chapters.length,
      chaptersFetched: ficData.core.chapters.length,
    });

    if (isCancelled(id)) return;
    await updateJob(id, { status: "rendering" });

    const renderer = RENDERERS[settings.format];
    const blob = await renderer(ficData, settings);
    console.log(`[fic-downloader] rendered ${settings.format}: ${blob.size} bytes, type="${blob.type}"`);

    if (isCancelled(id)) return;
    await updateJob(id, { status: "saving" });

    const isZip = blob.type === "application/zip" || (settings.chapterSplit && settings.format !== "epub");
    const extension = isZip ? "zip" : FORMAT_EXTENSIONS[settings.format];
    const baseName = formatFilename(settings.filenameTemplate, ficData);
    const filename = `${baseName}.${extension}`;

    const objectUrl = URL.createObjectURL(blob);
    console.log(`[fic-downloader] downloading as "${filename}" from ${objectUrl}`);
    const downloadId = await browser.downloads.download({ url: objectUrl, filename, saveAs: false });
    console.log(`[fic-downloader] download initiated, id=${downloadId}`);
    pendingObjectUrls.set(downloadId, objectUrl);

    await updateJob(id, { status: "complete", completedAt: Date.now(), downloadId });
    await notifyCompletion(ficData.core.title, true);
  } catch (error) {
    if (!isCancelled(id)) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fic-downloader] download failed for job ${id}:`, error);
      await updateJob(id, { status: "failed", error: message, completedAt: Date.now() });
      const jobs = await loadJobs();
      const failedTitle = jobs[id]?.title ?? url;
      await notifyCompletion(failedTitle, false);
    }
  }
}

async function notifyCompletion(title: string, success: boolean): Promise<void> {
  // Icon badge
  await browser.action.setBadgeText({ text: success ? "✓" : "!" });
  await browser.action.setBadgeBackgroundColor({ color: success ? "#7ecf7e" : "#e07070" });

  // Page toast — inject into active tab
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id == null) return;

    const message = success
      ? `Download complete: ${title}`
      : `Download failed: ${title}`;

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
  const existing = document.getElementById("fic-downloader-toast");
  existing?.remove();

  const toast = document.createElement("div");
  toast.id = "fic-downloader-toast";
  toast.attachShadow({ mode: "open" }).innerHTML = `
    <style>
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
    </style>
    <span>${message.replace(/</g, "&lt;")}</span>
  `;
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
    return Promise.resolve({ type: "validationError" as const, reason: "invalid-url" as const });
  }

  if (!detectParser(parsed.href)) {
    return Promise.resolve({ type: "validationError" as const, reason: "unsupported-site" as const });
  }

  return startDownload(url, overrides).then((id) => ({ type: "started" as const, id }));
}

export async function handleMessage(
  message: OrchestratorMessage,
): Promise<OrchestratorResponse> {
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
        if (!parser) return { type: "error" as const, message: "Unsupported site" };
        const settings = await getSettings();
        const data = await parser.parse(message.url, { ...settings, includeImages: false });
        return {
          type: "previewMetadata" as const,
          title: data.core.title,
          author: data.core.author,
          tags: data.core.tags,
        };
      } catch (error) {
        return { type: "error" as const, message: error instanceof Error ? error.message : String(error) };
      }
    }

    default:
      return Promise.resolve({ type: "error" as const, message: "Unknown message type" });
  }
}

export function handleDownloadChange(delta: { id: number; state?: { current?: string } }): void {
  const state = delta.state?.current;
  console.log(`[fic-downloader] download ${delta.id} state: ${state ?? "(unchanged)"}`);

  const objectUrl = pendingObjectUrls.get(delta.id);
  if (state === "complete" || state === "interrupted") {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      pendingObjectUrls.delete(delta.id);
    }
  }

  if (state === "interrupted") {
    void (async () => {
      try {
        const jobs = await loadJobs();
        const job = Object.values(jobs).find((job) => job.downloadId === delta.id);
        if (job && job.status === "complete") {
          console.log(`[fic-downloader] marking job ${job.id} as failed due to interrupted download`);
          await updateJob(job.id, {
            status: "failed",
            error: "Download was interrupted",
            completedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error("[fic-downloader] handleDownloadChange error:", error);
      }
    })();
  }
}
