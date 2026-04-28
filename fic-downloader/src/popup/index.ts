import { renderDownloadList } from "./screens/download-list.js";
import { renderUrlInput } from "./screens/url-input.js";
import { renderConfirmation } from "./screens/confirmation.js";
import { getSettings } from "../shared/settings.js";
import { isFicPage } from "../parsers/index.js";

type Screen = "list" | "url-input" | "confirmation";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");

let cleanup: (() => void) | null = null;
let currentScreen: Screen = "list";

async function navigate(screen: Screen, context?: { url?: string; title?: string }): Promise<void> {
  cleanup?.();
  cleanup = null;
  currentScreen = screen;

  switch (screen) {
    case "list":
      cleanup = await renderDownloadList(app!, () => void navigate("url-input"));
      break;

    case "url-input":
      cleanup = renderUrlInput(app!, () => void navigate("list"));
      break;

    case "confirmation": {
      const url = context?.url ?? "";
      const title = context?.title ?? "";
      cleanup = renderConfirmation(
        app!,
        url,
        title,
        () => void navigate("list"),
        () => void navigate("list"),
      );
      break;
    }
  }
}

async function init(): Promise<void> {
  void browser.action.setBadgeText({ text: "" });
  const settings = await getSettings();

  if (settings.confirmationDialogue) {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ?? "";
    if (isFicPage(url)) {
      void navigate("confirmation", { url, title: tab?.title ?? "" });
      return;
    }
  }

  void navigate("list");
}

void init();
