/**
 * Parser for `codex exec --json` JSONL output.
 *
 * Codex's JSONL schema has evolved over time, so this parser accepts the
 * documented stable shapes and a few legacy-compatible aliases while ignoring
 * unknown event types. It extracts the last completed agent/assistant message as
 * the final answer, preserves stderr diagnostics separately, and captures
 * lightweight web-search summaries for later Pi result formatting.
 */
import type {
  CodexWebSearchDiagnostics,
  CodexWebSearchFailureCode,
  CodexWebSearchNormalizedSuccess,
  CodexWebSearchRawEvent,
  CodexWebSearchSource,
  NormalizedCodexWebSearchInput,
} from "../tool/codexWebSearchApi.js";

export type CodexJsonlParserErrorCode = Extract<
  CodexWebSearchFailureCode,
  "codex_parse_error" | "codex_missing_final_message"
>;

export interface CodexJsonlRawOutput {
  stdout: string;
  stderr?: string;
  diagnostics?: CodexWebSearchDiagnostics;
}

export interface CodexJsonlParseOptions {
  /** Include bounded raw JSONL events in the parsed result for debug/details. */
  includeRawEvents?: boolean;
}

export interface CodexJsonlAgentMessage {
  id?: string;
  text: string;
  lineNumber: number;
  eventType?: string;
}

export interface CodexJsonlWebSearchSummary {
  id?: string;
  query?: string;
  action?: string;
  status?: string;
  url?: string;
  title?: string;
  lineNumber: number;
  eventType?: string;
}

export interface CodexJsonlParsedOutput {
  answer: string;
  finalAgentMessage: CodexJsonlAgentMessage;
  agentMessages: readonly CodexJsonlAgentMessage[];
  webSearches: readonly CodexJsonlWebSearchSummary[];
  sources: readonly CodexWebSearchSource[];
  rawEvents?: readonly CodexWebSearchRawEvent[];
  diagnostics?: CodexWebSearchDiagnostics;
}

export interface CodexJsonlParserErrorOptions {
  code: CodexJsonlParserErrorCode;
  message: string;
  lineNumber?: number;
  diagnostics?: CodexWebSearchDiagnostics;
  cause?: unknown;
}

export class CodexJsonlParserError extends Error {
  readonly code: CodexJsonlParserErrorCode;
  readonly retryable = false;
  readonly lineNumber?: number;
  readonly diagnostics?: CodexWebSearchDiagnostics;

  constructor(options: CodexJsonlParserErrorOptions) {
    super(options.message);
    this.name = "CodexJsonlParserError";
    this.code = options.code;

    if (options.lineNumber !== undefined) {
      this.lineNumber = options.lineNumber;
    }

    if (options.diagnostics !== undefined) {
      this.diagnostics = options.diagnostics;
    }

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

interface ParsedLine {
  lineNumber: number;
  event: Record<string, unknown>;
  eventType?: string;
}

interface SourceCollector {
  add(source: CodexWebSearchSource): void;
  values(): readonly CodexWebSearchSource[];
}

const AGENT_MESSAGE_ITEM_TYPES = new Set([
  "agent_message",
  "assistant_message",
  "agentmessage",
  "assistantmessage",
  "message",
]);

const WEB_SEARCH_ITEM_TYPES = new Set([
  "web_search",
  "websearch",
  "web_search_call",
  "websearchcall",
]);

const MAX_SOURCE_SCAN_DEPTH = 4;

export function isCodexJsonlParserError(error: unknown): error is CodexJsonlParserError {
  return error instanceof CodexJsonlParserError;
}

export function parseCodexJsonlOutput(
  raw: CodexJsonlRawOutput,
  options: CodexJsonlParseOptions = {},
): CodexJsonlParsedOutput {
  const diagnostics = normalizeDiagnostics(raw);
  const parsedLines = parseJsonlLines(raw.stdout, diagnostics);
  const agentMessages: CodexJsonlAgentMessage[] = [];
  const webSearches: CodexJsonlWebSearchSummary[] = [];
  const rawEvents: CodexWebSearchRawEvent[] = [];
  const sources = createSourceCollector();

  for (const parsedLine of parsedLines) {
    if (options.includeRawEvents === true) {
      rawEvents.push(createRawEvent(parsedLine));
    }

    const item = getEventItem(parsedLine.event);
    if (item !== undefined) {
      const message = extractAgentMessage(item, parsedLine);
      if (message !== undefined) {
        agentMessages.push(message);
        collectSources(item, sources);
      }

      const webSearch = extractWebSearchSummary(item, parsedLine);
      if (webSearch !== undefined) {
        webSearches.push(webSearch);
        collectSources(item, sources);
      }
    }

    const topLevelMessage = extractTopLevelAgentMessage(parsedLine);
    if (topLevelMessage !== undefined) {
      agentMessages.push(topLevelMessage);
      collectSources(parsedLine.event, sources);
    }

    const topLevelWebSearch = extractTopLevelWebSearchSummary(parsedLine);
    if (topLevelWebSearch !== undefined) {
      webSearches.push(topLevelWebSearch);
      collectSources(parsedLine.event, sources);
    }
  }

  const finalAgentMessage = agentMessages.at(-1);
  if (finalAgentMessage === undefined || finalAgentMessage.text.trim().length === 0) {
    const errorOptions: CodexJsonlParserErrorOptions = {
      code: "codex_missing_final_message",
      message: "Codex JSONL output did not include a completed final agent message.",
    };
    if (diagnostics !== undefined) {
      errorOptions.diagnostics = diagnostics;
    }
    throw new CodexJsonlParserError(errorOptions);
  }

  const result: CodexJsonlParsedOutput = {
    answer: finalAgentMessage.text,
    finalAgentMessage,
    agentMessages,
    webSearches,
    sources: sources.values(),
  };

  if (options.includeRawEvents === true) {
    result.rawEvents = rawEvents;
  }

  if (diagnostics !== undefined) {
    result.diagnostics = diagnostics;
  }

  return result;
}

export function parseCodexJsonlToolResult(
  raw: CodexJsonlRawOutput,
  input: Pick<NormalizedCodexWebSearchInput, "query" | "mode" | "liveSearch" | "includeRawEvents">,
): CodexWebSearchNormalizedSuccess {
  const parsed = parseCodexJsonlOutput(raw, { includeRawEvents: input.includeRawEvents });
  const result: CodexWebSearchNormalizedSuccess = {
    ok: true,
    query: input.query,
    mode: input.mode,
    liveSearch: input.liveSearch,
    answer: parsed.answer,
    sources: parsed.sources,
  };

  if (input.includeRawEvents && parsed.rawEvents !== undefined) {
    result.rawEvents = parsed.rawEvents;
  }

  if (parsed.diagnostics !== undefined) {
    result.diagnostics = parsed.diagnostics;
  }

  return result;
}

function parseJsonlLines(stdout: string, diagnostics: CodexWebSearchDiagnostics | undefined): ParsedLine[] {
  const parsedLines: ParsedLine[] = [];
  const lines = stdout.split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch (error) {
      const errorOptions: CodexJsonlParserErrorOptions = {
        code: "codex_parse_error",
        message: `Codex JSONL output contained malformed JSON at line ${index + 1}.`,
        lineNumber: index + 1,
        cause: error,
      };
      if (diagnostics !== undefined) {
        errorOptions.diagnostics = diagnostics;
      }
      throw new CodexJsonlParserError(errorOptions);
    }

    if (!isPlainObject(parsed)) {
      const errorOptions: CodexJsonlParserErrorOptions = {
        code: "codex_parse_error",
        message: `Codex JSONL output line ${index + 1} was not a JSON object.`,
        lineNumber: index + 1,
      };
      if (diagnostics !== undefined) {
        errorOptions.diagnostics = diagnostics;
      }
      throw new CodexJsonlParserError(errorOptions);
    }

    const eventType = getEventType(parsed);
    const parsedLine: ParsedLine = {
      lineNumber: index + 1,
      event: parsed,
    };
    if (eventType !== undefined) {
      parsedLine.eventType = eventType;
    }
    parsedLines.push(parsedLine);
  }

  return parsedLines;
}

function normalizeDiagnostics(raw: CodexJsonlRawOutput): CodexWebSearchDiagnostics | undefined {
  const diagnostics: CodexWebSearchDiagnostics = { ...(raw.diagnostics ?? {}) };

  if (raw.stdout.length > 0 && diagnostics.stdoutBytes === undefined) {
    diagnostics.stdoutBytes = Buffer.byteLength(raw.stdout, "utf8");
  }

  if (raw.stderr !== undefined && diagnostics.stderrBytes === undefined) {
    diagnostics.stderrBytes = Buffer.byteLength(raw.stderr, "utf8");
  }

  if (raw.stderr !== undefined && raw.stderr.length > 0 && diagnostics.stderr === undefined) {
    diagnostics.stderr = raw.stderr;
  }

  return Object.keys(diagnostics).length > 0 ? diagnostics : undefined;
}

function createRawEvent(parsedLine: ParsedLine): CodexWebSearchRawEvent {
  const rawEvent: CodexWebSearchRawEvent = { data: parsedLine.event };
  if (parsedLine.eventType !== undefined) {
    rawEvent.type = parsedLine.eventType;
  }
  return rawEvent;
}

function getEventType(event: Record<string, unknown>): string | undefined {
  const type = readString(event, "type");
  if (type !== undefined) {
    return type;
  }

  return readString(event, "method");
}

function getEventItem(event: Record<string, unknown>): Record<string, unknown> | undefined {
  const directItem = readPlainObject(event, "item");
  if (directItem !== undefined) {
    return directItem;
  }

  const params = readPlainObject(event, "params");
  const paramsItem = params === undefined ? undefined : readPlainObject(params, "item");
  if (paramsItem !== undefined) {
    return paramsItem;
  }

  const response = readPlainObject(event, "response");
  const responseItem = response === undefined ? undefined : readPlainObject(response, "item");
  if (responseItem !== undefined) {
    return responseItem;
  }

  return undefined;
}

function extractAgentMessage(
  item: Record<string, unknown>,
  parsedLine: ParsedLine,
): CodexJsonlAgentMessage | undefined {
  if (!isAgentMessageItem(item)) {
    return undefined;
  }

  const text = extractText(item);
  if (text === undefined) {
    return undefined;
  }

  return createAgentMessage(item, text, parsedLine);
}

function extractTopLevelAgentMessage(parsedLine: ParsedLine): CodexJsonlAgentMessage | undefined {
  const eventType = parsedLine.eventType;
  if (eventType === undefined) {
    return undefined;
  }

  const normalizedEventType = normalizeTypeName(eventType);
  if (!AGENT_MESSAGE_ITEM_TYPES.has(normalizedEventType)) {
    return undefined;
  }

  if (readString(parsedLine.event, "role") !== undefined && readString(parsedLine.event, "role") !== "assistant") {
    return undefined;
  }

  const text = extractText(parsedLine.event);
  if (text === undefined) {
    return undefined;
  }

  return createAgentMessage(parsedLine.event, text, parsedLine);
}

function createAgentMessage(
  value: Record<string, unknown>,
  text: string,
  parsedLine: ParsedLine,
): CodexJsonlAgentMessage {
  const message: CodexJsonlAgentMessage = {
    text,
    lineNumber: parsedLine.lineNumber,
  };

  const id = readString(value, "id") ?? readString(value, "item_id") ?? readString(value, "itemId");
  if (id !== undefined) {
    message.id = id;
  }

  if (parsedLine.eventType !== undefined) {
    message.eventType = parsedLine.eventType;
  }

  return message;
}

function isAgentMessageItem(item: Record<string, unknown>): boolean {
  const itemType = getItemType(item);
  if (itemType === undefined) {
    return false;
  }

  const normalizedItemType = normalizeTypeName(itemType);
  if (!AGENT_MESSAGE_ITEM_TYPES.has(normalizedItemType)) {
    return false;
  }

  if (normalizedItemType === "message") {
    return readString(item, "role") === "assistant";
  }

  return true;
}

function extractWebSearchSummary(
  item: Record<string, unknown>,
  parsedLine: ParsedLine,
): CodexJsonlWebSearchSummary | undefined {
  if (!isWebSearchItem(item)) {
    return undefined;
  }

  return createWebSearchSummary(item, parsedLine);
}

function extractTopLevelWebSearchSummary(parsedLine: ParsedLine): CodexJsonlWebSearchSummary | undefined {
  const eventType = parsedLine.eventType;
  if (eventType === undefined) {
    return undefined;
  }

  const normalizedEventType = normalizeTypeName(eventType);
  if (!normalizedEventType.includes("websearch")) {
    return undefined;
  }

  return createWebSearchSummary(parsedLine.event, parsedLine);
}

function createWebSearchSummary(
  value: Record<string, unknown>,
  parsedLine: ParsedLine,
): CodexJsonlWebSearchSummary {
  const actionObject = readPlainObject(value, "action");
  const summary: CodexJsonlWebSearchSummary = {
    lineNumber: parsedLine.lineNumber,
  };

  const id = readString(value, "id") ?? readString(value, "call_id") ?? readString(value, "callId");
  if (id !== undefined) {
    summary.id = id;
  }

  const query = readString(value, "query") ?? (actionObject === undefined ? undefined : readString(actionObject, "query"));
  if (query !== undefined) {
    summary.query = query;
  }

  const action = readString(value, "action") ?? (actionObject === undefined ? undefined : readString(actionObject, "type"));
  if (action !== undefined) {
    summary.action = action;
  }

  const status = readString(value, "status") ?? readString(value, "state");
  if (status !== undefined) {
    summary.status = status;
  }

  const url = findFirstUrl(value);
  if (url !== undefined) {
    summary.url = url;
  }

  const title = readString(value, "title") ?? (actionObject === undefined ? undefined : readString(actionObject, "title"));
  if (title !== undefined) {
    summary.title = title;
  }

  if (parsedLine.eventType !== undefined) {
    summary.eventType = parsedLine.eventType;
  }

  return summary;
}

function isWebSearchItem(item: Record<string, unknown>): boolean {
  const itemType = getItemType(item);
  if (itemType !== undefined && WEB_SEARCH_ITEM_TYPES.has(normalizeTypeName(itemType))) {
    return true;
  }

  const action = readPlainObject(item, "action");
  return action !== undefined && readString(item, "query") !== undefined && readString(action, "type") !== undefined;
}

function getItemType(item: Record<string, unknown>): string | undefined {
  return readString(item, "type") ?? readString(item, "item_type") ?? readString(item, "itemType") ?? readString(item, "kind");
}

function extractText(value: Record<string, unknown>): string | undefined {
  const directText = readString(value, "text") ?? readString(value, "output_text") ?? readString(value, "message");
  if (directText !== undefined) {
    return directText;
  }

  const content = value.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const fragments = content
      .map((entry) => extractTextFragment(entry))
      .filter((entry): entry is string => entry !== undefined && entry.length > 0);
    if (fragments.length > 0) {
      return fragments.join("");
    }
  }

  if (isPlainObject(content)) {
    return extractText(content);
  }

  return undefined;
}

function extractTextFragment(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  return readString(value, "text") ?? readString(value, "output_text") ?? readString(value, "content");
}

function collectSources(value: unknown, collector: SourceCollector): void {
  collectSourcesFromValue(value, collector, 0);
}

function collectSourcesFromValue(value: unknown, collector: SourceCollector, depth: number): void {
  if (depth > MAX_SOURCE_SCAN_DEPTH) {
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      collectSourcesFromValue(entry, collector, depth + 1);
    }
    return;
  }

  if (!isPlainObject(value)) {
    return;
  }

  const source = sourceFromObject(value);
  if (source !== undefined) {
    collector.add(source);
  }

  for (const key of ["annotations", "citations", "sources", "results", "content", "action"] as const) {
    if (key in value) {
      collectSourcesFromValue(value[key], collector, depth + 1);
    }
  }
}

function sourceFromObject(value: Record<string, unknown>): CodexWebSearchSource | undefined {
  const url = readString(value, "url") ?? readString(value, "uri") ?? readString(value, "source_url") ?? readString(value, "sourceUrl");
  if (url === undefined || !isHttpUrl(url)) {
    return undefined;
  }

  const source: CodexWebSearchSource = { url };
  const title = readString(value, "title") ?? readString(value, "name");
  if (title !== undefined) {
    source.title = title;
  }

  const snippet = readString(value, "snippet") ?? readString(value, "description") ?? readString(value, "text");
  if (snippet !== undefined && snippet !== url) {
    source.snippet = snippet;
  }

  return source;
}

function createSourceCollector(): SourceCollector {
  const sources: CodexWebSearchSource[] = [];
  const seenUrls = new Set<string>();

  return {
    add(source: CodexWebSearchSource): void {
      const normalizedUrl = source.url.trim();
      if (seenUrls.has(normalizedUrl)) {
        return;
      }
      seenUrls.add(normalizedUrl);

      const normalizedSource: CodexWebSearchSource = { url: normalizedUrl };
      if (source.title !== undefined) {
        normalizedSource.title = source.title;
      }
      if (source.snippet !== undefined) {
        normalizedSource.snippet = source.snippet;
      }
      sources.push(normalizedSource);
    },
    values(): readonly CodexWebSearchSource[] {
      return sources;
    },
  };
}

function findFirstUrl(value: unknown): string | undefined {
  const collector = createSourceCollector();
  collectSources(value, collector);
  return collector.values()[0]?.url;
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const rawValue = value[key];
  return typeof rawValue === "string" && rawValue.length > 0 ? rawValue : undefined;
}

function readPlainObject(value: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const rawValue = value[key];
  return isPlainObject(rawValue) ? rawValue : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeTypeName(typeName: string): string {
  return typeName.replace(/[^A-Za-z0-9]/gu, "").toLowerCase();
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
