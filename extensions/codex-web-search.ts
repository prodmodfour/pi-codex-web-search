/**
 * Pi Codex Web Search extension entrypoint.
 *
 * Keep this file light: all tool registration and execution wiring lives in
 * src/pi/registerCodexWebSearchTool.ts so it can be unit-tested without a real
 * Pi runtime or Codex login.
 */
import { registerCodexWebSearchTool } from "../src/pi/registerCodexWebSearchTool.js";
import type { PiExtensionApi } from "../src/pi/piExtensionContract.js";

export default function codexWebSearchExtension(pi: PiExtensionApi): void {
  registerCodexWebSearchTool(pi);
}
