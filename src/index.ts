export const PACKAGE_NAME = "pi-codex-web-search";
export const PI_EXTENSION_ENTRYPOINT = "./extensions/codex-web-search.ts";

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
