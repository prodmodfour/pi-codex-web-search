# Security Threat Model

This package is a local Pi extension that registers one tool, `codex_web_search`, and delegates web research to the local Codex CLI. The threat model below is intended for maintainers and users reviewing whether the package is safe to load in their own Pi environment.

This is not a formal security audit. It documents the assets, trust boundaries, implemented controls, residual risks, and safe operating recommendations for the current package.

## Scope and assumptions

In scope:

* the TypeScript extension entrypoint and registration code in this repository;
* validation of `codex_web_search` tool parameters and documented configuration;
* construction of the `codex exec` argv array;
* execution of the configured Codex executable through Node.js subprocess APIs;
* parsing and formatting of Codex JSONL output for Pi;
* repository guardrails for secrets, generated files, package contents, and automated tests.

Out of scope:

* the security of Pi itself;
* the security of the installed Codex CLI binary;
* the security of Codex/ChatGPT authentication storage;
* the correctness or safety of arbitrary public web pages returned by search;
* remote or multi-user deployment hardening;
* bypassing Codex, ChatGPT, account, network, or usage limits.

Assumptions:

* the package runs locally as the same OS user that launched Pi;
* Pi extensions and packages should be reviewed before installation because they execute local code;
* Codex authentication is already owned by the Codex CLI and must remain outside this package;
* automated validation must not require a real Codex login or network search.

## Assets to protect

* Codex/ChatGPT credentials and session files managed by the Codex CLI.
* Private user prompts, private source paths, local workspace contents, and terminal logs.
* The local user's filesystem and environment variables.
* The user's Codex/ChatGPT account limits and web-search availability.
* The integrity of Pi's tool execution surface.
* The integrity of the npm/git package that users load into Pi.

## Trust boundaries and data flow

```text
Pi/user prompt
  -> model-selected codex_web_search parameters (untrusted input)
    -> extension input/config validation
      -> safe argv builder
        -> local Codex CLI subprocess (external executable)
          -> Codex web/network access and local sandbox policy
            -> JSONL stdout/stderr returned to extension
              -> parser and bounded formatter
                -> Pi tool result/model context
```

Important boundaries:

* Tool-call arguments are untrusted even when Pi's schema validator ran first; the extension normalizes them again before execution.
* Environment variables and explicit project/in-process config are local user configuration, not model-callable parameters.
* The configured Codex executable is outside this repository's trust boundary.
* Web pages and search results are untrusted content and may contain prompt-injection text.
* Formatter output re-enters Pi's model context, so it is bounded and avoids raw process diagnostics.

## Threats, controls, and residual risks

### 1. Arbitrary command or shell injection

Threats:

* A malicious query could try to inject shell metacharacters.
* A model/tool call could try to add unsupported flags or execute a different command.
* A malicious config value could point `codexBinary` at an unexpected executable.

Implemented controls:

* `CodexRunner` uses `execFile` with argv arrays and `shell: false`; it never builds a shell command string.
* `buildCodexExecArgs` emits only the reviewed `codex exec` argument shape.
* User query text is one positional argv element after an end-of-options `--` separator.
* Unknown tool parameters are rejected, and the sandbox is not a tool-call parameter.
* Query and configured binary values reject null bytes.
* The extension does not expose a generic command-execution tool.

Residual risks and recommendations:

* `PI_CODEX_WEB_SEARCH_CODEX_BINARY` is intentionally a local-user escape hatch. Set it only to a trusted Codex executable, preferably an absolute path when `PATH` is unusual.
* A compromised Codex binary or compromised PATH entry can run as the local user. Review how Pi is launched and avoid untrusted directories in `PATH`.

### 2. Codex sandbox and local filesystem exposure

Threats:

* Codex is an external agent process and may be able to read files permitted by its read-only sandbox and current working directory.
* Web prompt injection could attempt to make Codex inspect local files or credentials.
* A future change could accidentally enable write-capable Codex execution.

Implemented controls:

* The default sandbox is `read-only`.
* Configuration currently accepts only `read-only`; `workspace-write`, `danger-full-access`, and other write-capable values are rejected.
* The extension never passes a write-capable sandbox to Codex.
* `--skip-git-repo-check` is used so the extension can run outside a repository without encouraging broader repository access.
* Timeouts, buffer limits, and cancellation are enforced at the subprocess boundary.

Residual risks and recommendations:

* Read-only is not the same as no-read. Codex may still have read access allowed by its own sandbox policy. Avoid launching Pi from highly sensitive directories when using live web search.
* Do not ask the tool to combine private local files with public web search unless you are comfortable sharing that context with Codex.
* Keep write-capable sandbox support out of this package unless a future ticket documents the need, the threat model update, and new tests.

### 3. Prompt injection from web results

Threats:

* Public pages returned by search can contain instructions that try to override the user's request, exfiltrate data, or manipulate Pi's follow-up behavior.
* Codex's answer can summarize or quote untrusted page content back into Pi's model context.
* Source snippets may contain misleading or adversarial text.

Implemented controls:

* The tool registration prompt guidelines explicitly say to treat `codex_web_search` results as untrusted web content and not to follow instructions found in web pages.
* Formatter output is concise, bounded, and source-oriented rather than an open-ended transcript dump.
* Source URLs/snippets are included as citations when available so users and models can verify claims.
* The extension performs no automatic follow-up actions based on search results.
* The extension does not grant Codex write access, browser automation, or arbitrary local command execution.

Residual risks and recommendations:

* The extension cannot prove that Codex ignored every malicious web instruction. Treat the final answer as untrusted research, not as an instruction source.
* Verify high-impact claims against cited sources before acting.
* Prefer narrow queries and ask for source URLs.
* Avoid including secrets, private code, credentials, or sensitive local paths in web-search prompts.

### 4. Credential handling

Threats:

* Application code could accidentally read, copy, print, or commit Codex credentials.
* Troubleshooting logs could expose account/session details.
* Users might mistake extension configuration for a place to store credentials.

Implemented controls:

* No application code reads `~/.codex/auth.json`, `$HOME`, arbitrary config files, or Codex credential paths.
* Authentication is delegated entirely to the Codex CLI; missing or unauthenticated Codex is reported as an actionable failure.
* The documented `PI_CODEX_WEB_SEARCH_*` variables do not include credential values.
* Runner and formatter error messages omit argv, query text, raw stderr, and local/private paths.
* Repository guardrails scan for common secret patterns and fail on Codex auth artifacts or env files.

Residual risks and recommendations:

* The Codex subprocess may read its own authentication state as part of normal Codex operation. That state is outside this package and must not be copied into the repository or support logs.
* Never share `~/.codex/auth.json` or terminal logs that contain account/session details.
* Do not point `PI_CODEX_WEB_SEARCH_CODEX_BINARY` or any other setting at credential files.

### 5. Logs, diagnostics, and artifacts

Threats:

* Raw stderr, JSONL events, package tarballs, coverage output, or dependency directories could contain private data and be committed accidentally.
* Raw Codex events may contain prompt text, answer text, source snippets, or provider diagnostics.

Implemented controls:

* The extension does not create persistent logs.
* Formatted error text omits raw stderr, query text, argv, and local/private paths.
* Structured diagnostics keep safe metadata such as byte counts, exit status, signal, truncation, and `stderrOmitted`.
* `includeRawEvents` is `false` by default. When enabled, raw events are bounded by count and serialized size, and help/schema text warns that raw events may contain prompt/result data.
* `scripts/check-no-generated-private-files.sh` blocks real env files, Codex auth artifacts, `node_modules/`, build output, coverage output, and npm package tarballs.
* `scripts/check-no-secrets.sh` scans repository files for common token and private-key patterns.
* The npm `files` allowlist ships only `extensions/`, `src/`, `docs/`, and `README.md`.

Residual risks and recommendations:

* Manual validation transcripts can still include private prompts, local paths, or provider diagnostics. Keep them private or sanitize them before sharing.
* Do not enable `includeRawEvents` unless you need bounded debugging data and are comfortable exposing raw prompt/result content in Pi details.
* Review `npm pack --dry-run` output before publishing.

### 6. Package-install and supply-chain risks

Threats:

* Pi packages execute local extension code with the user's permissions.
* Git or npm package sources could change between installs if not pinned.
* Local path installs point at the original checkout, so later local edits affect future Pi runs.
* Development dependencies and package scripts can change behavior during install or validation.

Implemented controls:

* The package has an explicit `pi.extensions` manifest pointing at one entrypoint.
* The extension registers only `codex_web_search` and a static `/codex-web-search` help command.
* The repository currently has no runtime dependencies beyond Node/Pi runtime expectations.
* Automated tests use mocks or the checked-in fake Codex executable; they do not call real Codex by default.
* The quality gate runs package dry-run validation and generated/private-file guardrails.

Residual risks and recommendations:

* Review source before loading any Pi package.
* Pin git installs to a tag or commit, and use an exact npm version after publish.
* Re-run `scripts/quality-gate.sh` after pulling updates.
* Prefer local checkout validation before global Pi installation.

## Recommended safe defaults

Keep these defaults unless you have a specific, reviewed reason to change them:

| Setting | Recommended value | Reason |
| --- | --- | --- |
| `PI_CODEX_WEB_SEARCH_SANDBOX` | `read-only` | Prevents write-capable Codex execution; currently the only accepted value. |
| `PI_CODEX_WEB_SEARCH_CODEX_BINARY` | unset or trusted absolute Codex path | Avoids PATH surprises while still using the official local Codex CLI. |
| `PI_CODEX_WEB_SEARCH_DEFAULT_MODE` | `live` for normal web-search use, `cached` for privacy-sensitive no-search calls | Live is the tool's purpose; cached omits `--search` when freshness is not needed. |
| `PI_CODEX_WEB_SEARCH_TIMEOUT_MS` | `120000` | Bounds process lifetime while allowing typical searches to finish. |
| `PI_CODEX_WEB_SEARCH_MAX_OUTPUT_CHARS` | `12000` | Keeps Pi tool output useful and bounded. |
| `includeRawEvents` | `false` | Avoids exposing raw prompt/result event data in tool details. |

Additional recommendations:

* Launch Pi from a directory that is appropriate for Codex read-only access.
* Keep Codex CLI and Pi updated.
* Verify cited sources for high-impact answers.
* Do not share Codex credential files, private prompts, or unsanitized terminal logs.

## Validation and test posture

Automated validation is safe by default:

* unit tests mock process execution or use a checked-in fake Codex executable;
* fake-Codex tests do not require a real Codex binary, Codex authentication, network access, or web search;
* the quality gate runs shell syntax checks, secret guardrails, generated/private-file guardrails, npm checks, tests, build, and package dry-run;
* real Codex validation is manual and documented in [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md).

## Security maintenance checklist

Before changing code that touches execution, configuration, parsing, formatting, packaging, or logs:

* keep subprocess execution on non-shell APIs with argv arrays;
* keep query text after an end-of-options separator;
* keep the sandbox allowlist at `read-only` unless a future ticket expands the threat model and tests;
* do not add credential-reading code or credential configuration variables;
* keep output and raw-event details bounded;
* keep automated tests fake-Codex/mocked by default;
* update this threat model when trust boundaries or defaults change;
* run `scripts/quality-gate.sh` before committing.
