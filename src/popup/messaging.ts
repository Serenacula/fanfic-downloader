import type { OrchestratorMessage, OrchestratorResponse } from "../background/orchestrator.js";

export function send(message: OrchestratorMessage): Promise<OrchestratorResponse> {
  return browser.runtime.sendMessage(message) as Promise<OrchestratorResponse>;
}
