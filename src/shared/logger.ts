import { getSettings } from "./settings.js";

let debugEnabled = false;

// initLogger() resolves asynchronously, so debugLog calls during the first
// ticks of background startup are dropped even with the flag on. Acceptable —
// this is for after-the-fact debugging, not the startup sequence itself.
export function initLogger(): void {
  void getSettings().then((settings) => {
    debugEnabled = settings.debugLogging;
  });

  browser.storage.onChanged.addListener((changes, areaName) => {
    // storage.session is written on every progress tick during a download;
    // without this guard the listener would re-read settings constantly.
    if (areaName !== "local" || changes["settings"] === undefined) return;
    void getSettings().then((settings) => {
      debugEnabled = settings.debugLogging;
    });
  });
}

export function debugLog(...args: unknown[]): void {
  if (!debugEnabled) return;
  console.log("[fanfic-downloader]", ...args);
}
