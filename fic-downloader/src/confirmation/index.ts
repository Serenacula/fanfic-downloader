export {};

import { getSettings, type Settings } from "../shared/settings.js";
import type { DataOverrides } from "../background/orchestrator.js";

const FORMATS: Array<{ value: Settings["format"]; label: string }> = [
  { value: "epub", label: "ePub (.epub)" },
  { value: "html", label: "HTML (.html)" },
  { value: "markdown", label: "Markdown (.md)" },
  { value: "txt", label: "Plain Text (.txt)" },
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Word Document (.docx)" },
];

const params = new URLSearchParams(window.location.search);
const url = params.get("url") ?? "";

function toggle(key: keyof Settings, label: string, value: boolean): string {
  return `
    <label class="toggle-row">
      <input type="checkbox" data-key="${key}" ${value ? "checked" : ""} />
      <span>${label}</span>
    </label>
  `;
}

function escHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function init(): Promise<void> {
  const settings = await getSettings();
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <h1>Download Preview</h1>
    <p class="url">${escHtml(url)}</p>

    <section>
      <h2>Metadata Overrides</h2>

      <div class="override-row">
        <input type="checkbox" id="tog-title" />
        <div>
          <label class="field-label" for="override-title">Title</label>
          <input type="text" id="override-title" placeholder="Fetching…" disabled />
        </div>
      </div>

      <div class="override-row">
        <input type="checkbox" id="tog-author" />
        <div>
          <label class="field-label" for="override-author">Author</label>
          <input type="text" id="override-author" placeholder="Fetching…" disabled />
        </div>
      </div>

      <div class="override-row">
        <input type="checkbox" id="tog-tags" />
        <div>
          <label class="field-label" for="override-tags">Tags <span style="color:#7b6aa0;font-size:11px">(comma-separated)</span></label>
          <textarea id="override-tags" placeholder="Fetching…" disabled></textarea>
        </div>
      </div>
    </section>

    <section>
      <h2>Download Settings</h2>
      <label class="section-label">Format</label>
      <select id="format">
        ${FORMATS.map((f) => `<option value="${f.value}" ${settings.format === f.value ? "selected" : ""}>${f.label}</option>`).join("")}
      </select>
      ${toggle("includeImages", "Include images", settings.includeImages)}
      ${toggle("includeCoverImage", "Generate cover image", settings.includeCoverImage)}
      ${toggle("includeCoverPage", "Include story info page", settings.includeCoverPage)}
      <p style="font-size:11px;color:#7b6aa0;margin:2px 0 6px 26px">Fields shown can be configured in Settings.</p>
      ${toggle("includeToc", "Include table of contents", settings.includeToc)}
      ${toggle("includeChapterTitles", "Include chapter titles", settings.includeChapterTitles)}
      ${toggle("includeAuthorNotes", "Include author notes", settings.includeAuthorNotes)}
      ${toggle("chapterSplit", "Save as separate files per chapter", settings.chapterSplit)}
    </section>

    <div class="actions">
      <button id="btn-cancel" class="btn-secondary">Cancel</button>
      <button id="btn-download" class="btn-primary">Download</button>
    </div>
  `;

  // Wire override checkboxes to enable/disable their inputs
  for (const [togId, inputId] of [
    ["tog-title", "override-title"],
    ["tog-author", "override-author"],
    ["tog-tags", "override-tags"],
  ] as const) {
    document.getElementById(togId)?.addEventListener("change", (event) => {
      const checked = (event.target as HTMLInputElement).checked;
      const input = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) input.disabled = !checked;
    });
  }

  document.getElementById("btn-cancel")?.addEventListener("click", () => {
    browser.tabs.getCurrent()
      .then((tab) => { if (tab?.id !== undefined) void browser.tabs.remove(tab.id); else window.close(); })
      .catch(() => window.close());
  });

  document.getElementById("btn-download")?.addEventListener("click", async () => {
    const titleEnabled = (document.getElementById("tog-title") as HTMLInputElement).checked;
    const authorEnabled = (document.getElementById("tog-author") as HTMLInputElement).checked;
    const tagsEnabled = (document.getElementById("tog-tags") as HTMLInputElement).checked;

    const titleInput = (document.getElementById("override-title") as HTMLInputElement).value.trim();
    const authorInput = (document.getElementById("override-author") as HTMLInputElement).value.trim();
    const tagsInput = (document.getElementById("override-tags") as HTMLTextAreaElement).value.trim();

    const dataOverrides: DataOverrides = {};
    if (titleEnabled && titleInput) dataOverrides.title = titleInput;
    if (authorEnabled && authorInput) dataOverrides.author = authorInput;
    if (tagsEnabled && tagsInput) {
      dataOverrides.tags = tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean);
    }

    const format = (document.getElementById("format") as HTMLSelectElement).value as Settings["format"];
    const settingsOverrides: Partial<Settings> = { format };
    for (const checkbox of Array.from(document.querySelectorAll<HTMLInputElement>("input[data-key]"))) {
      const key = checkbox.dataset["key"] as keyof Settings;
      (settingsOverrides as Record<string, unknown>)[key] = checkbox.checked;
    }

    await browser.runtime.sendMessage({
      type: "startDownload",
      url,
      overrides: settingsOverrides,
      dataOverrides,
    });

    window.close();
  });

  // Fetch real metadata and populate placeholders/fields
  void fetchPreviewMetadata();
}

function setFallbackPlaceholders(): void {
  const titleInput = document.getElementById("override-title") as HTMLInputElement | null;
  const authorInput = document.getElementById("override-author") as HTMLInputElement | null;
  const tagsInput = document.getElementById("override-tags") as HTMLTextAreaElement | null;
  if (titleInput && !titleInput.value) titleInput.placeholder = "Title from site";
  if (authorInput && !authorInput.value) authorInput.placeholder = "Author from site";
  if (tagsInput && !tagsInput.value) tagsInput.placeholder = "tag1, tag2, tag3";
}

async function fetchPreviewMetadata(): Promise<void> {
  const timeoutId = setTimeout(setFallbackPlaceholders, 12_000);
  try {
    const response = await browser.runtime.sendMessage({ type: "getPreviewMetadata", url }) as
      | { type: "previewMetadata"; title: string; author: string; tags: string[] }
      | { type: string };

    clearTimeout(timeoutId);

    if (response?.type !== "previewMetadata") {
      setFallbackPlaceholders();
      return;
    }

    const { title, author, tags } = response as { type: "previewMetadata"; title: string; author: string; tags: string[] };

    const titleToggle = document.getElementById("tog-title") as HTMLInputElement | null;
    const titleInput = document.getElementById("override-title") as HTMLInputElement | null;
    if (titleInput && !titleToggle?.checked && !titleInput.value) {
      titleInput.placeholder = title;
    }

    const authorToggle = document.getElementById("tog-author") as HTMLInputElement | null;
    const authorInput = document.getElementById("override-author") as HTMLInputElement | null;
    if (authorInput && !authorToggle?.checked && !authorInput.value) {
      authorInput.placeholder = author;
    }

    const tagsToggle = document.getElementById("tog-tags") as HTMLInputElement | null;
    const tagsInput = document.getElementById("override-tags") as HTMLTextAreaElement | null;
    if (tagsInput && !tagsToggle?.checked && !tagsInput.value && tags.length > 0) {
      tagsInput.placeholder = tags.join(", ");
    }
  } catch {
    clearTimeout(timeoutId);
    setFallbackPlaceholders();
  }
}

void init();
