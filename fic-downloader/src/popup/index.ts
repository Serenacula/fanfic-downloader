import { renderDownloadList } from "./screens/download-list.js";
import { renderUrlInput } from "./screens/url-input.js";

type Screen = "list" | "url-input";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");

let cleanup: (() => void) | null = null;

async function navigate(screen: Screen): Promise<void> {
  cleanup?.();
  cleanup = null;

  switch (screen) {
    case "list":
      cleanup = await renderDownloadList(app!, () => void navigate("url-input"));
      break;

    case "url-input":
      cleanup = renderUrlInput(app!, () => void navigate("list"));
      break;
  }
}

async function init(): Promise<void> {
  void browser.action.setBadgeText({ text: "" });
  void navigate("list");
}

void init();
