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
}

export type OrchestratorMessage =
  | { type: "getJobs" }
  | { type: "startDownload"; url: string; overrides?: Partial<Settings> }
  | { type: "startDownloadByUrl"; url: string; overrides?: Partial<Settings> }
  | { type: "cancelJob"; id: string }
  | { type: "retryJob"; id: string };

export type OrchestratorResponse =
  | { type: "jobs"; jobs: DownloadJob[] }
  | { type: "started"; id: string }
  | { type: "cancelled"; id: string }
  | { type: "retried"; id: string }
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
  };
  await saveJob(job);
  void runDownload(id, url, overrides);
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

async function runDownload(id: string, url: string, overrides?: Partial<Settings>): Promise<void> {
  try {
    const settings = { ...(await getSettings()), ...overrides };
    const parser = detectParser(url);
    if (!parser) throw new Error(`Unsupported site: ${url}`);

    await updateJob(id, { status: "fetching-metadata" });
    if (isCancelled(id)) return;

    const ficData: FicData = await parser.parse(url, settings);
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

    if (isCancelled(id)) return;
    await updateJob(id, { status: "saving" });

    const extension = FORMAT_EXTENSIONS[settings.format];
    const baseName = formatFilename(settings.filenameTemplate, ficData);
    const filename = `${baseName}.${extension}`;

    const objectUrl = URL.createObjectURL(blob);
    await browser.downloads.download({ url: objectUrl, filename, saveAs: false });
    URL.revokeObjectURL(objectUrl);

    await updateJob(id, { status: "complete", completedAt: Date.now() });
    await notifyCompletion(ficData.core.title, true);
  } catch (error) {
    if (!isCancelled(id)) {
      const message = error instanceof Error ? error.message : String(error);
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

export function handleMessage(
  message: OrchestratorMessage,
): Promise<OrchestratorResponse> {
  switch (message.type) {
    case "getJobs":
      return getJobs().then((jobs) => ({ type: "jobs" as const, jobs }));

    case "startDownload":
      return startDownload(message.url, message.overrides).then((id) => ({
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

    default:
      return Promise.resolve({ type: "error" as const, message: "Unknown message type" });
  }
}
