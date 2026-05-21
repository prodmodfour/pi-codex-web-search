export const PACKAGE_NAME = "pi-codex-web-search";
export const PI_EXTENSION_ENTRYPOINT = "./extensions/codex-web-search.ts";

export {
  CODEX_EXEC_PROMPT_SEPARATOR,
  CODEX_EXEC_SUBCOMMAND,
  CodexArgvBuilderError,
  SAFE_CODEX_SANDBOXES,
  SUPPORTED_CODEX_OUTPUT_FORMATS,
  buildCodexExecArgs,
  isSafeCodexSandboxMode,
  isSupportedCodexOutputFormat,
} from "./codex/buildCodexArgs.js";

export {
  CODEX_RUNNER_KILL_SIGNAL,
  CodexRunner,
  CodexRunnerError,
  DEFAULT_CODEX_BINARY,
} from "./codex/CodexRunner.js";

export {
  CODEX_WEB_SEARCH_CONFIG_DEFAULTS,
  CODEX_WEB_SEARCH_CONFIG_ENV_VARS,
  CodexWebSearchConfigError,
  formatCodexWebSearchConfigIssues,
  loadCodexWebSearchConfig,
  readCodexWebSearchEnvConfig,
  validateCodexWebSearchConfig,
} from "./config/codexWebSearchConfig.js";

export {
  CodexJsonlParserError,
  isCodexJsonlParserError,
  parseCodexJsonlOutput,
  parseCodexJsonlToolResult,
} from "./codex/CodexJsonlParser.js";

export {
  CODEX_WEB_SEARCH_FORMAT_LIMITS,
  boundCodexWebSearchToolText,
  formatCodexWebSearchToolResult,
} from "./output/formatToolResult.js";

export {
  CODEX_WEB_SEARCH_HELP_COMMAND_DESCRIPTION,
  CODEX_WEB_SEARCH_HELP_COMMAND_NAME,
  CODEX_WEB_SEARCH_HELP_TEXT,
  createCodexWebSearchHelpCommandDefinition,
  registerCodexWebSearchHelpCommand,
  showCodexWebSearchHelp,
} from "./pi/registerCodexWebSearchHelpCommand.js";

export {
  CODEX_WEB_SEARCH_TOOL_DESCRIPTION,
  CODEX_WEB_SEARCH_TOOL_LABEL,
  CODEX_WEB_SEARCH_TOOL_PARAMETERS,
  CODEX_WEB_SEARCH_TOOL_PROMPT_GUIDELINES,
  CODEX_WEB_SEARCH_TOOL_PROMPT_SNIPPET,
  CodexWebSearchToolExecutionError,
  createCodexWebSearchToolDefinition,
  createCodexWebSearchToolParameters,
  executeCodexWebSearchTool,
  registerCodexWebSearchTool,
} from "./pi/registerCodexWebSearchTool.js";

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
  SafeCodexSandboxMode,
  SupportedCodexOutputFormat,
} from "./codex/buildCodexArgs.js";

export type {
  CodexWebSearchConfig,
  CodexWebSearchConfigInput,
  CodexWebSearchConfigValidationCode,
  CodexWebSearchConfigValidationIssue,
  CodexWebSearchConfigValidationResult,
  CodexWebSearchConfigValidationSource,
  CodexWebSearchEnvironment,
  LoadCodexWebSearchConfigOptions,
} from "./config/codexWebSearchConfig.js";

export type {
  CodexArgsBuilder,
  CodexOutputParser,
  CodexRunnerErrorCode,
  CodexRunnerErrorOptions,
  CodexRunnerExecutor,
  CodexRunnerExecutorCallback,
  CodexRunnerExecutorOptions,
  CodexRunnerOptions,
  CodexRunnerParsedResult,
  CodexRunnerProcessError,
  CodexRunnerRawResult,
  CodexRunnerRunOptions,
} from "./codex/CodexRunner.js";

export type {
  CodexJsonlAgentMessage,
  CodexJsonlParsedOutput,
  CodexJsonlParseOptions,
  CodexJsonlParserErrorCode,
  CodexJsonlParserErrorOptions,
  CodexJsonlRawOutput,
  CodexJsonlWebSearchSummary,
} from "./codex/CodexJsonlParser.js";

export type {
  CodexWebSearchFormattedErrorDetails,
  CodexWebSearchPiToolResult,
  CodexWebSearchSafeDiagnostics,
  CodexWebSearchToolResultDetails,
  FormatCodexWebSearchToolResultOptions,
} from "./output/formatToolResult.js";

export type {
  CodexWebSearchPiToolDefinition,
  CodexWebSearchToolExecutionErrorOptions,
  CodexWebSearchToolRunner,
  ExecuteCodexWebSearchToolOptions,
  RegisterCodexWebSearchToolOptions,
} from "./pi/registerCodexWebSearchTool.js";

export type {
  CodexOutputFormat,
  CodexSandboxMode,
  CodexWebSearchDiagnostics,
  CodexWebSearchErrorDetails,
  CodexWebSearchInputDefaults,
  CodexWebSearchInputNormalizationOptions,
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
  PiExtensionUi,
  PiImageContent,
  PiNotificationLevel,
  PiTextContent,
  PiToolContent,
  PiToolDefinition,
  PiToolExecutionMode,
  PiToolResult,
  PiToolUpdateCallback,
} from "./pi/piExtensionContract.js";
