import { send } from "../messaging.js";

export function renderConfirmation(
  container: HTMLElement,
  sourceUrl: string,
  suggestedTitle: string,
  onConfirm: () => void,
  onCancel: () => void,
): () => void {
  container.innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <button id="btn-cancel" class="btn-back">✕ Cancel</button>
        <h2>Confirm Download</h2>
      </div>
      <div class="screen-body">
        <p class="conf-url">${escHtml(sourceUrl)}</p>

        <label for="conf-title">Title override <span class="optional">(optional)</span></label>
        <input id="conf-title" type="text" placeholder="${escAttr(suggestedTitle)}" />

        <label for="conf-author">Author override <span class="optional">(optional)</span></label>
        <input id="conf-author" type="text" placeholder="Leave blank to use site value" />

        <button id="btn-confirm" class="btn-primary">Download</button>
      </div>
    </div>
  `;

  container.querySelector("#btn-confirm")?.addEventListener("click", () => {
    const titleInput = container.querySelector<HTMLInputElement>("#conf-title")!.value.trim();
    const authorInput = container.querySelector<HTMLInputElement>("#conf-author")!.value.trim();

    // Overrides only applied if the user filled them in
    const overrides: Record<string, string> = {};
    if (titleInput) overrides["_titleOverride"] = titleInput;
    if (authorInput) overrides["_authorOverride"] = authorInput;

    void send({ type: "startDownload", url: sourceUrl }).then(() => onConfirm());
  });

  container.querySelector("#btn-cancel")?.addEventListener("click", onCancel);

  return () => {};
}

function escHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(text: string): string {
  return text.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
