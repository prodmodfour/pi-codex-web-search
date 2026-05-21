# BUILD_NOTES.md

## Current state

Tickets 000, 001, 002, 003, 004, 005, and 006 are complete. The repository has a TypeScript/npm Pi package skeleton, project-specific validation guardrails, a frozen Pi extension/package contract, the finalized `codex_web_search` tool API contract, a safe `codex exec` argv builder, a bounded Codex subprocess runner, and a JSONL parser for `codex exec --json` stdout.

Ticket 006 added in this cycle:

* created `src/codex/CodexJsonlParser.ts`
* added `parseCodexJsonlOutput(...)` to parse non-empty JSONL stdout lines safely and reject malformed/non-object records as `codex_parse_error`
* added `CodexJsonlParserError` with stable `codex_parse_error` and `codex_missing_final_message` codes, retryability metadata, optional line numbers, optional diagnostics, and sanitized messages that do not echo raw JSONL, query text, or stderr
* extracted completed agent/assistant messages from current `item.completed` events plus compatibility aliases such as `item.item_type: "assistant_message"` and JSON-RPC-style `method: "item/completed"` / `params.item.type: "agentMessage"`
* selected the last completed agent/assistant message as the parsed answer
* captured lightweight web-search summaries from `web_search`, `webSearch`, and `web_search_call` item shapes when present
* extracted deduplicated HTTP(S) sources from annotations, citations, sources, results, content, and web-search action URLs when Codex provides them
* preserved stderr and byte-count diagnostics separately from answer text
* included bounded raw event objects only when `includeRawEvents` is requested
* added `parseCodexJsonlToolResult(...)` to wrap parsed output in the existing `CodexWebSearchNormalizedSuccess` shape for later formatter/registration code
* exported parser functions, error class, type guard, and parser types from `src/index.ts`
* added `test/codex-jsonl-parser.test.mjs` with representative JSONL fixtures covering current events, compatibility aliases, web-search events, sources, raw events, diagnostics, malformed JSONL, non-object records, and missing final messages
* updated README, `docs/ARCHITECTURE.md`, `docs/EXTENSION_SPEC.md`, and `docs/SECURITY.md` for the parser boundary and safety posture

The placeholder extension still intentionally does not call Codex or register `codex_web_search`; later tickets own tool-result formatting and final Pi registration.

No Codex live search, authenticated Codex run, or Codex task execution was used. A local `codex exec --help` check and documentation/code search were used only to confirm the documented `--json` event families.

## Quality gates

Ran `scripts/quality-gate.sh` successfully after implementing Ticket 006. An initial quality-gate attempt stopped at the generated/private-file guardrail because `node_modules/` existed from an ad-hoc local `npm ci`; `node_modules/` was removed and the full gate then passed cleanly.

The passing gate performed:

* shell syntax checks through `scripts/check-shell-syntax.sh`
* secret guardrail through `scripts/check-no-secrets.sh`
* generated/private-file guardrail before Node checks
* `npm ci`
* `npm run lint --if-present`
* `npm run typecheck --if-present`
* `npm test --if-present` with 33 passing tests
* `npm run build --if-present`
* `npm run pack:check`
* cleanup of `node_modules/` created by the gate
* generated/private-file guardrail after cleanup

The npm package dry-run included the intended package files from `files`: README, docs, extension source, package metadata, Pi contract source, tool API source, Codex argv-builder source, Codex runner source, and the new Codex JSONL parser source. `node_modules/` was removed by the gate before exit.

## Known blockers and limitations

None for automated quality validation.

The local Pi contract in `src/pi/piExtensionContract.ts` is intentionally narrow and mirrors only the subset frozen in `docs/EXTENSION_SPEC.md`. It should be replaced or reconciled explicitly if a future ticket imports official Pi runtime types or TypeBox schemas directly.

The API, argv builder, runner, and parser still do not format Pi results, register the Pi tool, or read user configuration. The current sandbox allowlist is intentionally limited to `read-only`; future configuration work must explicitly validate and document any override.

`CodexJsonlParser` supports documented and representative JSONL event aliases but cannot guarantee every future Codex event schema. Unknown events are ignored, and missing final completed agent messages are reported clearly as `codex_missing_final_message`.

`CodexRunner` can execute a real Codex binary when called directly by future code, but automated tests only use mocked executors and JSONL fixtures. Manual real-Codex validation will require a machine with:

* Pi installed
* Codex CLI installed
* `codex login` completed with the user's ChatGPT/Codex account

## Next recommended ticket

Ticket 007 — Implement tool-result formatting.
