import type { DownloadJob } from "../../background/orchestrator.js";
import { send } from "../messaging.js";
import { isFicPage } from "../../parsers/index.js";
import { getSettings } from "../../shared/settings.js";

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

export async function renderDownloadList(
  container: HTMLElement,
  onNavigateUrl: () => void,
): Promise<() => void> {
  // Check if current tab is a fic page
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url ?? "";
  const isOnFicPage = isFicPage(currentUrl);

  container.innerHTML = `
    <div class="screen" id="screen-list">
      <div class="toolbar">
        <button id="btn-download" class="btn-primary" ${isOnFicPage ? "" : "disabled"} title="${isOnFicPage ? "Download this fic" : "Not a supported fic page"}">
          Download
        </button>
        <button id="btn-url" class="btn-secondary">URL</button>
        <a id="btn-settings" href="#" class="btn-icon" title="Settings">⚙</a>
      </div>
      <div id="job-list" class="job-list"></div>
    </div>
  `;

  const jobListEl = container.querySelector<HTMLElement>("#job-list")!;

  async function refreshJobs(): Promise<void> {
    const response = await send({ type: "getJobs" });
    if (response.type !== "jobs") return;

    if (response.jobs.length === 0) {
      jobListEl.innerHTML = `<p class="empty">No downloads yet.</p>`;
      return;
    }

    jobListEl.innerHTML = response.jobs
      .map((job) => {
        const active = isActive(job);
        const title = job.title ?? new URL(job.url).hostname;
        return `
          <div class="job ${job.status}" data-id="${job.id}">
            <div class="job-title">${title}</div>
            <div class="job-status">${statusLabel(job)}</div>
            ${active ? `<button class="btn-cancel" data-id="${job.id}">✕</button>` : ""}
            ${job.status === "complete" && job.downloadId != null ? `<button class="btn-open" data-id="${job.id}" title="Show in folder"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg></button>` : ""}
            ${job.status === "failed" ? `<button class="btn-retry" data-id="${job.id}">↺ Retry</button>` : ""}
          </div>
        `;
      })
      .join("");
  }

  const interval = setInterval(() => void refreshJobs(), 800);
  void refreshJobs();

  container.querySelector("#btn-download")?.addEventListener("click", async () => {
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

  container.querySelector("#btn-url")?.addEventListener("click", onNavigateUrl);

  container.querySelector("#btn-settings")?.addEventListener("click", (event) => {
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
