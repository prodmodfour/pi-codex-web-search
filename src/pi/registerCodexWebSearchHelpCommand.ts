/**
 * Optional slash-command help surface for the Codex web-search extension.
 *
 * The command is intentionally informational only. It does not execute Codex,
 * read configuration, inspect credentials, or send user input to a subprocess.
 */
import type {
  PiCommandDefinition,
  PiExtensionApi,
  PiExtensionCommandContext,
} from "./piExtensionContract.js";
import {
  CODEX_WEB_SEARCH_DEFAULTS,
  CODEX_WEB_SEARCH_LIMITS,
  CODEX_WEB_SEARCH_TOOL_NAME,
} from "../tool/codexWebSearchApi.js";

export const CODEX_WEB_SEARCH_HELP_COMMAND_NAME = "codex-web-search" as const;
export const CODEX_WEB_SEARCH_HELP_COMMAND_DESCRIPTION =
  `Show help for the ${CODEX_WEB_SEARCH_TOOL_NAME} tool.`;

export const CODEX_WEB_SEARCH_HELP_TEXT = [
  `${CODEX_WEB_SEARCH_TOOL_NAME} help`,
  "",
  `Use ${CODEX_WEB_SEARCH_TOOL_NAME} when you need current, source-backed web information through the local Codex CLI.`,
  "",
  "Tool parameters:",
  `- query (required): search question or research task, 1-${CODEX_WEB_SEARCH_LIMITS.queryMaxChars} chars after trimming.`,
  `- mode: \"live\" (default; uses Codex --search) or \"cached\" (omits --search).`,
  `- timeoutMs: ${CODEX_WEB_SEARCH_DEFAULTS.timeoutMs} default; ${CODEX_WEB_SEARCH_LIMITS.timeoutMsMin}-${CODEX_WEB_SEARCH_LIMITS.timeoutMsMax} ms allowed.`,
  `- maxOutputChars: ${CODEX_WEB_SEARCH_DEFAULTS.maxOutputChars} default; ${CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMin}-${CODEX_WEB_SEARCH_LIMITS.maxOutputCharsMax} chars allowed.`,
  "- includeRawEvents: false by default; only enable for bounded debugging details.",
  "",
  "Default live invocation: codex exec --json --search --skip-git-repo-check --sandbox read-only -- <query>",
  "Prerequisites: install the Codex CLI and run codex login. This extension never reads Codex credential files.",
  "Example prompt: Use codex_web_search to find the latest Pi extension docs and summarize source links.",
].join("\n");

export function registerCodexWebSearchHelpCommand(pi: PiExtensionApi): void {
  pi.registerCommand(CODEX_WEB_SEARCH_HELP_COMMAND_NAME, createCodexWebSearchHelpCommandDefinition());
}

export function createCodexWebSearchHelpCommandDefinition(): PiCommandDefinition {
  return {
    description: CODEX_WEB_SEARCH_HELP_COMMAND_DESCRIPTION,
    handler: async (_args, ctx) => {
      showCodexWebSearchHelp(ctx);
    },
  };
}

export function showCodexWebSearchHelp(ctx: PiExtensionCommandContext): boolean {
  if (ctx.hasUI === false || typeof ctx.ui?.notify !== "function") {
    return false;
  }

  ctx.ui.notify(CODEX_WEB_SEARCH_HELP_TEXT, "info");
  return true;
}
