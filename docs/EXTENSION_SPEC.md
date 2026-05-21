# Extension Spec

## Goal

Create a Pi extension that registers a `codex_web_search` tool. The tool asks the local Codex CLI to perform a web-enabled answer and returns the final answer to Pi.

## Target tool

Name: `codex_web_search`

Purpose: search the web through Codex CLI from inside Pi, primarily to let a user with ChatGPT/Codex login reuse Codex's web-search capability rather than calling the OpenAI API web-search endpoint.

## Draft parameters

```ts
interface CodexWebSearchInput {
  query: string;
  mode?: "live" | "cached";
  timeoutMs?: number;
  maxOutputChars?: number;
  includeRawEvents?: boolean;
}
```

Defaults should be conservative:

```text
mode: live when the user explicitly asks for current/latest information; otherwise cached may be acceptable if supported
timeoutMs: 120000
maxOutputChars: 12000
includeRawEvents: false
sandbox: read-only
codex binary: codex
```

## Codex command shape

The implementation should use a subprocess API with argv arrays. Do not use shell string interpolation.

Expected live-search argv shape:

```bash
codex exec --json --search --skip-git-repo-check --sandbox read-only "<prompt>"
```

Expected cached/default argv shape, if supported and documented during research:

```bash
codex exec --json --skip-git-repo-check --sandbox read-only "<prompt>"
```

The prompt should ask Codex to return a concise answer and include sources when available.

## Output handling

Preferred path:

1. run `codex exec --json`
2. parse JSONL events
3. extract final agent message
4. extract web-search event/source summaries where available
5. format for Pi

Fallback path:

* if JSONL parsing proves unstable, consume final stdout from non-JSON mode and document that source extraction is best effort.

## Safety requirements

* no shell command construction from query input
* no reading or logging of Codex credentials
* no default write sandbox
* bounded output
* timeout handling
* tests do not invoke real Codex by default
