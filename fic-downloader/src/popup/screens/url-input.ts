import { send } from "../messaging.js";

export function renderUrlInput(container: HTMLElement, onBack: () => void): () => void {
  container.innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <button id="btn-back" class="btn-back">← Back</button>
        <h2>Download by URL</h2>
      </div>
      <div class="screen-body">
        <label for="url-input">Paste a fic URL:</label>
        <input id="url-input" type="url" placeholder="https://archiveofourown.org/works/…" autofocus />
        <p id="url-error" class="error hidden"></p>
        <button id="btn-submit" class="btn-primary">Download</button>
      </div>
    </div>
  `;

  const input = container.querySelector<HTMLInputElement>("#url-input")!;
  const errorEl = container.querySelector<HTMLParagraphElement>("#url-error")!;
  const submitBtn = container.querySelector<HTMLButtonElement>("#btn-submit")!;

  function showError(message: string): void {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function clearError(): void {
    errorEl.classList.add("hidden");
  }

  async function handleSubmit(): Promise<void> {
    clearError();
    const url = input.value.trim();
    if (!url) { showError("Please enter a URL."); return; }

    submitBtn.disabled = true;
    const response = await send({ type: "startDownloadByUrl", url });

    if (response.type === "started") {
      onBack();
    } else if (response.type === "validationError") {
      showError(
        response.reason === "invalid-url"
          ? "That doesn't look like a valid URL."
          : "That site isn't supported yet.",
      );
    } else {
      showError("Something went wrong. Please try again.");
    }
    submitBtn.disabled = false;
  }

  submitBtn.addEventListener("click", () => void handleSubmit());
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") void handleSubmit();
  });
  container.querySelector("#btn-back")?.addEventListener("click", onBack);

  return () => {};
}
