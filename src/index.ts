export const PACKAGE_NAME = "pi-codex-web-search";
export const PI_EXTENSION_ENTRYPOINT = "./extensions/codex-web-search.ts";

export {
  CODEX_WEB_SEARCH_DEFAULTS,
  CODEX_WEB_SEARCH_LIMITS,
  CODEX_WEB_SEARCH_MODES,
  CODEX_WEB_SEARCH_TOOL_NAME,
  CodexWebSearchValidationError,
  formatCodexWebSearchValidationIssues,
  isCodexWebSearchMode,
  normalizeCodexWebSearchInput,
  validateCodexWebSearchInput,
} from "./tool/codexWebSearchApi.js";

export type {
  CodexOutputFormat,
  CodexSandboxMode,
  CodexWebSearchDiagnostics,
  CodexWebSearchErrorDetails,
  CodexWebSearchFailureCode,
  CodexWebSearchMode,
  CodexWebSearchNormalizedFailure,
  CodexWebSearchNormalizedResult,
  CodexWebSearchNormalizedSuccess,
  CodexWebSearchRawEvent,
  CodexWebSearchSource,
  CodexWebSearchToolInput,
  CodexWebSearchValidationCode,
  CodexWebSearchValidationIssue,
  CodexWebSearchValidationResult,
  NormalizedCodexExecutionOptions,
  NormalizedCodexWebSearchInput,
} from "./tool/codexWebSearchApi.js";

export type {
  PiCommandDefinition,
  PiExtensionApi,
  PiExtensionCommandContext,
  PiExtensionContext,
  PiExtensionFactory,
  PiImageContent,
  PiTextContent,
  PiToolContent,
  PiToolDefinition,
  PiToolExecutionMode,
  PiToolResult,
  PiToolUpdateCallback,
} from "./pi/piExtensionContract.js";
