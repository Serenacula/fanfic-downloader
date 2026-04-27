// Background service worker entry point.
// Application logic will be added in subsequent work items.

browser.runtime.onInstalled.addListener(() => {
  console.log("Fic Downloader installed.");
});
