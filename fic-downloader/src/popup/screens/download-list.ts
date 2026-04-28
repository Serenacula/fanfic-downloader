import type { DownloadJob } from "../../background/orchestrator.js";
import { send } from "../messaging.js";
import { isFicPage } from "../../parsers/index.js";

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
            ${job.status === "failed" ? `<button class="btn-retry" data-id="${job.id}">↺ Retry</button>` : ""}
          </div>
        `;
      })
      .join("");
  }

  const interval = setInterval(() => void refreshJobs(), 800);
  void refreshJobs();

  container.querySelector("#btn-download")?.addEventListener("click", () => {
    if (isOnFicPage) void send({ type: "startDownload", url: currentUrl });
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
  });

  return () => clearInterval(interval);
}
