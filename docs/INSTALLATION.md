# Installation and Package Loading

This package is a Pi package that exposes one extension through the `pi.extensions` manifest. It can be loaded from a local checkout, a git source, or an npm package source once published.

## Prerequisites

* Node.js 20+ for local development and validation.
* Pi installed and available as `pi`.
* Codex CLI installed and authenticated with `codex login` if you want real live search.
* A Pi model/provider configured so Pi can decide when to call tools.

When Codex is authenticated with a ChatGPT/Codex account, live search calls made by this extension use the local Codex CLI and may consume that account's Codex/ChatGPT plan limits. They do not use OpenAI API web-search billing by default. This package cannot bypass Codex, ChatGPT, account, network, or web-search availability limits.

## Local checkout

Use local loading while developing or validating a clone.

```bash
git clone <repo-url> pi-codex-web-search
cd pi-codex-web-search
npm install
npm test
```

Temporary one-session load from the package root:

```bash
pi -e .
```

Temporary load from another directory:

```bash
pi -e /absolute/path/to/pi-codex-web-search
```

Install for the current Pi project:

```bash
pi install -l /absolute/path/to/pi-codex-web-search
pi
```

Install globally for the current user:

```bash
pi install /absolute/path/to/pi-codex-web-search
pi
```

Local path package entries point at the original checkout rather than copying it. If you move or delete the checkout, remove or update the Pi package entry.

For a tiny docs-only project fixture with the expected `.pi/settings.json` package entry, help command check, sample prompt, and expected `codex_web_search` behavior, see [`EXAMPLE_LOCAL_PI_PROJECT.md`](EXAMPLE_LOCAL_PI_PROJECT.md).

## Git source

Use a pinned tag, branch, or commit when loading from git so future updates are intentional.

Temporary one-session load:

```bash
pi -e git:github.com/<owner>/pi-codex-web-search@<tag-or-commit>
```

Project-local install:

```bash
pi install -l git:github.com/<owner>/pi-codex-web-search@<tag-or-commit>
pi
```

Global user install:

```bash
pi install git:github.com/<owner>/pi-codex-web-search@<tag-or-commit>
pi
```

Pi clones git packages into its package cache and runs package installation as needed. Review the source before installing, because Pi extensions execute with local user permissions.

## npm-style source

The repository currently declares the package name `pi-codex-web-search` and version `0.0.0`. Use npm-style Pi sources only after the package is published under the expected name and version.

Temporary one-session load:

```bash
pi -e npm:pi-codex-web-search@0.0.0
```

Project-local install:

```bash
pi install -l npm:pi-codex-web-search@0.0.0
pi
```

Global user install:

```bash
pi install npm:pi-codex-web-search@0.0.0
pi
```

Replace `0.0.0` with the published version you intend to run. Run `npm run pack:check` from this repository before publishing or consuming a local package tarball, and follow the release checklist in [`RELEASE.md`](RELEASE.md).

## Verify the package loaded

After Pi starts with the package loaded, run:

```text
/codex-web-search
```

Expected result: Pi displays static help for the `codex_web_search` tool. This command must not execute Codex.

Then ask Pi to call the tool explicitly, for example:

```text
Use the codex_web_search tool in live mode to find the latest Node.js LTS release line. Return two concise bullets with source URLs.
```

See [`MANUAL_VALIDATION.md`](MANUAL_VALIDATION.md) for the full real-Codex validation path.

## Package manifest and discovery

The package uses an explicit Pi manifest in `package.json`:

```json
{
  "keywords": ["pi-package", "pi-extension", "codex", "web-search"],
  "pi": {
    "extensions": ["./extensions/codex-web-search.ts"]
  }
}
```

Manifest paths are relative to the package root. Pi loads the TypeScript extension entrypoint through its extension runtime, so this package ships TypeScript source instead of compiled JavaScript.

Pi can also auto-discover conventional extension directories when a package has no explicit `pi` manifest. Conventional locations include top-level package `extensions/` directories and user/project extension directories such as `~/.pi/agent/extensions/` and `.pi/extensions/`. This package intentionally keeps the explicit manifest so reviewers can see the exact extension entrypoint that Pi will load.

The npm `files` allowlist ships only the package resources needed by Pi users: `extensions/`, `src/`, `docs/`, and `README.md`. Test fixtures, local build artifacts, dependency directories, shell scripts, local workflow notes, and private files are not intended to be included in the npm package. `npm run pack:check` verifies this allowlist with an npm dry-run before release.

## Caveats

* Real search depends on the installed Codex CLI, local authentication, network access, and account-level search availability.
* The Codex JSONL event schema may change; automated tests cover representative fixtures, while real-Codex behavior still needs manual validation.
* The package currently supports local single-user execution only.
* The sandbox configuration currently accepts only `read-only`; write-capable Codex execution is intentionally unsupported.
* This package does not scrape ChatGPT Web, automate browsers, bypass usage limits, or provide generic arbitrary command execution.
* Windows and unusual shell/PATH setups have not been fully validated; prefer explicit `PI_CODEX_WEB_SEARCH_CODEX_BINARY` if Pi cannot find `codex`.
