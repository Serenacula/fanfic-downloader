import type { DownloadJob } from "../../background/orchestrator.js";
import { send } from "../messaging.js";
import { isFicPage } from "../../parsers/index.js";
import { getSettings } from "../../shared/settings.js";

const FOLDER_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>`;

function statusLabel(job: DownloadJob): string {
  switch (job.status) {
    case "queued": return "Queued";
    case "fetching-metadata": return "Fetching info…";
    case "fetching-chapters": {
      if (job.chaptersTotal != null) {
        return `Fetching ${job.chaptersFetched}/${job.chaptersTotal} chapters`;
      }
      return "Fetching chapters…";
    }
    case "rendering": return "Rendering…";
    case "saving": return "Saving…";
    case "complete": return "Complete";
    case "failed": return `Failed: ${job.error ?? "unknown error"}`;
    case "cancelled": return "Cancelled";
  }
}

function isActive(job: DownloadJob): boolean {
  return ["queued", "fetching-metadata", "fetching-chapters", "rendering", "saving"].includes(job.status);
}

function buildJobElement(job: DownloadJob): HTMLElement {
  const active = isActive(job);
  const title = job.title ?? new URL(job.url).hostname;

  const el = document.createElement("div");
  el.classList.add("job", job.status);
  el.dataset["id"] = job.id;

  const titleEl = document.createElement("div");
  titleEl.className = "job-title";
  titleEl.textContent = title;

  const statusEl = document.createElement("div");
  statusEl.className = "job-status";
  statusEl.textContent = statusLabel(job);

  el.append(titleEl, statusEl);

  if (active) {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-cancel";
    cancelBtn.dataset["id"] = job.id;
    cancelBtn.textContent = "✕";
    el.appendChild(cancelBtn);
  }

  if (job.status === "complete" && job.downloadId != null) {
    const openBtn = document.createElement("button");
    openBtn.className = "btn-open";
    openBtn.dataset["id"] = job.id;
    openBtn.title = "Show in folder";
    openBtn.innerHTML = FOLDER_SVG;
    el.appendChild(openBtn);
  }

  if (job.status === "failed") {
    const retryBtn = document.createElement("button");
    retryBtn.className = "btn-retry";
    retryBtn.dataset["id"] = job.id;
    retryBtn.textContent = "↺ Retry";
    el.appendChild(retryBtn);
  }

  return el;
}

export async function renderDownloadList(
  container: HTMLElement,
  onNavigateUrl: () => void,
): Promise<() => void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url ?? "";
  const isOnFicPage = isFicPage(currentUrl);

  const screen = document.createElement("div");
  screen.id = "screen-list";
  screen.className = "screen";

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";

  const downloadBtn = document.createElement("button");
  downloadBtn.id = "btn-download";
  downloadBtn.className = "btn-primary";
  downloadBtn.textContent = "Download";
  if (!isOnFicPage) {
    downloadBtn.disabled = true;
    downloadBtn.title = "Not a supported fic page";
  } else {
    downloadBtn.title = "Download this fic";
  }

  const urlBtn = document.createElement("button");
  urlBtn.id = "btn-url";
  urlBtn.className = "btn-secondary";
  urlBtn.textContent = "URL";

  const settingsLink = document.createElement("a");
  settingsLink.id = "btn-settings";
  settingsLink.href = "#";
  settingsLink.className = "btn-icon";
  settingsLink.title = "Settings";
  settingsLink.textContent = "⚙";

  toolbar.append(downloadBtn, urlBtn, settingsLink);

  const jobListEl = document.createElement("div");
  jobListEl.id = "job-list";
  jobListEl.className = "job-list";

  screen.append(toolbar, jobListEl);
  container.replaceChildren(screen);

  async function refreshJobs(): Promise<void> {
    const response = await send({ type: "getJobs" });
    if (response.type !== "jobs") return;

    if (response.jobs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No downloads yet.";
      jobListEl.replaceChildren(empty);
      return;
    }

    jobListEl.replaceChildren(...response.jobs.map(buildJobElement));
  }

  const interval = setInterval(() => void refreshJobs(), 800);
  void refreshJobs();

  downloadBtn.addEventListener("click", async () => {
    if (!isOnFicPage) return;
    const settings = await getSettings();
    if (settings.confirmationDialogue) {
      await browser.tabs.create({
        url: browser.runtime.getURL("src/confirmation/index.html") +
          `?url=${encodeURIComponent(currentUrl)}`,
      });
    } else {
      void send({ type: "startDownload", url: currentUrl });
    }
  });

  urlBtn.addEventListener("click", onNavigateUrl);

  settingsLink.addEventListener("click", (event) => {
    event.preventDefault();
    void browser.runtime.openOptionsPage();
  });

  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const jobId = target.dataset["id"];
    if (!jobId) return;

    if (target.classList.contains("btn-cancel")) {
      void send({ type: "cancelJob", id: jobId }).then(() => void refreshJobs());
    }
    if (target.classList.contains("btn-retry")) {
      void send({ type: "retryJob", id: jobId }).then(() => void refreshJobs());
    }
    if (target.classList.contains("btn-open")) {
      void send({ type: "openDownload", id: jobId });
    }
  });

  return () => clearInterval(interval);
}
