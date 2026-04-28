import { handleMessage, type OrchestratorMessage } from "./orchestrator.js";

browser.runtime.onInstalled.addListener(() => {
  // Create a periodic alarm to keep the service worker alive during downloads
  void browser.alarms.create("keepalive", { periodInMinutes: 0.4 });
});

browser.alarms.onAlarm.addListener(() => {
  // No-op — just prevents the SW from being suspended
});

browser.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse) => {
    void handleMessage(message as OrchestratorMessage).then(sendResponse);
    return true; // Keep the message channel open for async response
  },
);
