/**
 * Minimal Pi extension contract used by this package's automated tests and
 * internal wiring while the real Pi runtime remains an external dependency.
 *
 * This intentionally models only the subset frozen in docs/EXTENSION_SPEC.md.
 * It is not a replacement for @earendil-works/pi-coding-agent's official types.
 */
export interface PiTextContent {
  type: "text";
  text: string;
}

export interface PiImageContent {
  type: "image";
  source: unknown;
}

export type PiToolContent = PiTextContent | PiImageContent;

export interface PiToolResult<TDetails = unknown> {
  content: PiToolContent[];
  details: TDetails;
  terminate?: boolean;
}

export type PiNotificationLevel = "info" | "warning" | "error";

export interface PiExtensionUi {
  notify(message: string, level?: PiNotificationLevel): void;
}

export type PiToolUpdateCallback<TDetails = unknown> = (partialResult: PiToolResult<TDetails>) => void;

export interface PiExtensionContext {
  cwd: string;
  hasUI?: boolean;
  signal?: AbortSignal;
  ui?: PiExtensionUi;
}

export interface PiExtensionCommandContext extends PiExtensionContext {
  waitForIdle?: () => Promise<void>;
}

export type PiToolExecutionMode = "parallel" | "sequential";

export interface PiToolDefinition<TParams = unknown, TDetails = unknown> {
  name: string;
  label: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  parameters: unknown;
  prepareArguments?: (args: unknown) => TParams;
  executionMode?: PiToolExecutionMode;
  execute(
    toolCallId: string,
    params: TParams,
    signal: AbortSignal | undefined,
    onUpdate: PiToolUpdateCallback<TDetails> | undefined,
    ctx: PiExtensionContext,
  ): Promise<PiToolResult<TDetails>>;
}

export interface PiCommandDefinition {
  description?: string;
  getArgumentCompletions?: (argumentPrefix: string) => unknown[] | null | Promise<unknown[] | null>;
  handler(args: string, ctx: PiExtensionCommandContext): Promise<void> | void;
}

export interface PiExtensionApi {
  registerTool<TParams = unknown, TDetails = unknown>(tool: PiToolDefinition<TParams, TDetails>): void;
  registerCommand(name: string, options: PiCommandDefinition): void;
}

export type PiExtensionFactory = (pi: PiExtensionApi) => void | Promise<void>;
