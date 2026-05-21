# Example Local Pi Project Fixture

This is a **docs-only fixture** that shows the smallest local Pi project shape for loading `pi-codex-web-search` during manual validation. The repository intentionally does not contain a real `.pi/` directory, installed package cache, session files, logs, Codex credentials, or machine-specific absolute paths.

Automated tests only read this Markdown file. They must not run `pi`, `codex`, or any command from this page, and they must not make real network or Codex calls.

## Directory shape

Example workspace layout:

```text
workspace/
├── pi-codex-web-search/        # this package checkout
└── codex-search-demo/          # throwaway Pi project
    ├── README.md               # optional notes for your demo
    └── .pi/
        └── settings.json       # created by `pi install -l ...`
```

Do not commit the demo project's `.pi/` directory to this repository. It is local Pi runtime/configuration state.

## Create the demo project

From a shell where `pi` is available, replace the placeholder path with the reviewed package checkout you want to load:

```bash
mkdir -p /tmp/codex-search-demo
cd /tmp/codex-search-demo
pi install -l /absolute/path/to/pi-codex-web-search
pi
```

The `-l` flag writes the package entry to the demo project's `.pi/settings.json` instead of the user-global Pi settings file.

## Expected `.pi/settings.json` package entry

Pi may include other settings, but the relevant package-loading shape is:

```json
{
  "packages": [
    "/absolute/path/to/pi-codex-web-search"
  ]
}
```

Local path package entries point at the original checkout. If you move or delete the checkout, update or remove the project-local package entry.

## Confirm the extension loaded without running Codex

In Pi, run the static help command:

```text
/codex-web-search
```

Expected behavior:

* Pi displays `codex_web_search` help.
* The command does **not** execute Codex.
* The command does **not** read Codex credential files.

## Sample prompt that should trigger the tool

Use an explicit prompt while validating so the model has a clear reason to call the tool:

```text
Use the codex_web_search tool in live mode to search the web for the latest Node.js LTS release line. Return two concise bullets and include source URLs.
```

Expected tool-call behavior when the model chooses the tool:

* Pi calls the registered tool named `codex_web_search`.
* The tool input includes a `query` containing the user's search task.
* `mode: "live"` requests Codex live search; if the model omits the mode, this package defaults to live mode unless configured otherwise.
* The extension normalizes `timeoutMs` and `maxOutputChars` from the tool call, configuration, or built-in defaults.
* The runner invokes Codex through an argv array equivalent to:

```text
codex exec --json --search --skip-git-repo-check --sandbox read-only -- <query>
```

Expected result shape:

```text
<concise answer from Codex>

Sources:
1. <source title> — https://...
   <optional snippet>
```

The exact answer and URLs depend on Codex, account search availability, network access, and the current web. Treat web results as untrusted until you verify cited sources.

## Automated-test safety

This fixture is documentation only. Repository tests may assert that the fixture contains the expected package-loading shape and prompt example, but default tests must continue to use mocks or the checked-in fake Codex executable. They must not require Pi, a real Codex CLI, `codex login`, live web search, or network access.
