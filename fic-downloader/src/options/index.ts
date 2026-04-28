export {};

import { getSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from "../shared/settings.js";

const FORMATS: Array<{ value: Settings["format"]; label: string }> = [
  { value: "epub", label: "ePub (.epub)" },
  { value: "html", label: "HTML (.html)" },
  { value: "markdown", label: "Markdown (.md)" },
  { value: "txt", label: "Plain Text (.txt)" },
  { value: "pdf", label: "PDF (.pdf)" },
  { value: "docx", label: "Word Document (.docx)" },
];

function render(settings: Settings): void {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div class="settings">
      <h1>Fic Downloader — Settings</h1>

      <section>
        <h2>Download Format</h2>
        <select id="format">
          ${FORMATS.map((format) => `<option value="${format.value}" ${settings.format === format.value ? "selected" : ""}>${format.label}</option>`).join("")}
        </select>
        <p id="chapter-split-note" class="note ${settings.format === "epub" ? "" : "hidden"}">
          ePub is a single file by design — chapters are spine items, not separate files.
        </p>
      </section>

      <section>
        <h2>Content</h2>
        ${toggle("includeImages", "Include images", settings.includeImages)}
        ${toggle("includeCoverImage", "Generate cover image", settings.includeCoverImage)}
        ${toggle("includeCoverPage", "Include story info page", settings.includeCoverPage)}
        ${toggle("includeToc", "Include table of contents", settings.includeToc)}
        ${toggle("includeAuthorNotes", "Include author notes", settings.includeAuthorNotes)}
        ${toggle("includeChapterTitles", "Include chapter titles", settings.includeChapterTitles)}
        <div class="${settings.format === "epub" ? "disabled-row" : ""}">
          ${toggle("chapterSplit", "Save as separate files per chapter", settings.chapterSplit)}
          <p id="split-epub-note" class="note ${settings.format === "epub" ? "" : "hidden"}">
            Not available for ePub.
          </p>
        </div>
      </section>

      <section>
        <h2>Behaviour</h2>
        ${toggle("confirmationDialogue", "Show confirmation dialogue before downloading", settings.confirmationDialogue)}

        <label>Minimum delay between requests (ms)</label>
        <input id="rateLimitMs" type="number" min="0" max="10000" value="${settings.rateLimitMs}" />
      </section>

      <section>
        <h2>Filename Template</h2>
        <input id="filenameTemplate" type="text" value="${escAttr(settings.filenameTemplate)}" />
        <p class="note">
          Available keywords: <code>{title}</code>, <code>{author}</code>,
          <code>{currentDate}</code>, <code>{publishDate}</code>, <code>{updateDate}</code>
        </p>
        <p class="note">Extension is added automatically.</p>
      </section>

      <div class="actions">
        <span id="save-status" class="save-status"></span>
        <button id="btn-reset" class="btn-secondary">Reset to defaults</button>
      </div>
    </div>
  `;

  wireEvents();
}

function toggle(key: keyof Settings, label: string, value: boolean): string {
  return `
    <label class="toggle-row">
      <input type="checkbox" data-key="${key}" ${value ? "checked" : ""} />
      <span>${label}</span>
    </label>
  `;
}

function escAttr(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function wireEvents(): void {
  async function save(): Promise<void> {
    const format = (document.getElementById("format") as HTMLSelectElement).value as Settings["format"];
    const rateLimitMs = parseInt((document.getElementById("rateLimitMs") as HTMLInputElement).value, 10);
    const filenameTemplate = (document.getElementById("filenameTemplate") as HTMLInputElement).value;

    const checkboxPatch: Partial<Settings> = {};
    for (const checkbox of Array.from(document.querySelectorAll<HTMLInputElement>("input[data-key]"))) {
      const key = checkbox.dataset["key"] as keyof Settings;
      (checkboxPatch as Record<string, unknown>)[key] = checkbox.checked;
    }

    await saveSettings({
      format,
      rateLimitMs: isNaN(rateLimitMs) ? DEFAULT_SETTINGS.rateLimitMs : rateLimitMs,
      filenameTemplate: filenameTemplate || DEFAULT_SETTINGS.filenameTemplate,
      ...checkboxPatch,
    });

    const statusEl = document.getElementById("save-status");
    if (statusEl) {
      statusEl.textContent = "Saved";
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => { statusEl.textContent = ""; }, 1500);
    }

    // Update ePub-related UI
    const isEpub = format === "epub";
    document.getElementById("chapter-split-note")?.classList.toggle("hidden", !isEpub);
    document.getElementById("split-epub-note")?.classList.toggle("hidden", !isEpub);
    const splitCheckbox = document.querySelector<HTMLInputElement>('input[data-key="chapterSplit"]');
    if (splitCheckbox) {
      splitCheckbox.disabled = isEpub;
      splitCheckbox.closest("div")?.classList.toggle("disabled-row", isEpub);
    }
  }

  document.addEventListener("change", () => void save());
  document.getElementById("filenameTemplate")?.addEventListener("input", () => void save());
  document.getElementById("rateLimitMs")?.addEventListener("input", () => void save());

  document.getElementById("btn-reset")?.addEventListener("click", async () => {
    await saveSettings({ ...DEFAULT_SETTINGS });
    const current = await getSettings();
    render(current);
  });
}

async function init(): Promise<void> {
  const settings = await getSettings();
  render(settings);
}

void init();
