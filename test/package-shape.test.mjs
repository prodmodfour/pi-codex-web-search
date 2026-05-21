import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJsonUrl = new URL("../package.json", import.meta.url);
const qualityGateDocsUrl = new URL("../docs/QUALITY_GATE.md", import.meta.url);
const localPiProjectExampleDocsUrl = new URL("../docs/EXAMPLE_LOCAL_PI_PROJECT.md", import.meta.url);
const qualityWorkflowUrl = new URL("../.github/workflows/quality.yml", import.meta.url);
const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

test("package declares the Pi extension entrypoint", () => {
  assert.deepEqual(packageJson.pi?.extensions, ["./extensions/codex-web-search.ts"]);
});

test("extension source exists", () => {
  assert.equal(existsSync(new URL("../extensions/codex-web-search.ts", import.meta.url)), true);
});

test("npm scripts map to the quality gate", () => {
  for (const scriptName of [
    "quality",
    "check:shell",
    "guard:secrets",
    "guard:generated",
    "lint",
    "typecheck",
    "test",
    "build",
    "pack:check",
  ]) {
    assert.equal(typeof packageJson.scripts?.[scriptName], "string", `${scriptName} script should exist`);
  }
});

test("package files allowlist stays narrow", () => {
  assert.deepEqual(packageJson.files, ["extensions", "src", "docs", "README.md"]);
});

test("pack check uses the package contents validator", () => {
  assert.match(packageJson.scripts["pack:check"], /scripts\/check-package-contents\.mjs/);
  assert.equal(existsSync(new URL("../scripts/check-package-contents.mjs", import.meta.url)), true);
});

test("release documentation exists", () => {
  assert.equal(existsSync(new URL("../docs/RELEASE.md", import.meta.url)), true);
});

test("local Pi project example is docs-only and describes expected loading behavior", async () => {
  assert.equal(existsSync(localPiProjectExampleDocsUrl), true);

  const docs = await readFile(localPiProjectExampleDocsUrl, "utf8");
  assert.match(docs, /docs-only fixture/);
  assert.match(docs, /\.pi\/settings\.json/);
  assert.match(docs, /pi install -l \/absolute\/path\/to\/pi-codex-web-search/);
  assert.match(docs, /Use the codex_web_search tool in live mode/);
  assert.match(docs, /codex exec --json --search --skip-git-repo-check --sandbox read-only -- <query>/);
  assert.match(docs, /Automated tests only read this Markdown file/);
  assert.match(docs, /must not run `pi`, `codex`, or any command from this page/);
});

test("GitHub Actions quality workflow runs the local quality gate", async () => {
  assert.equal(existsSync(qualityWorkflowUrl), true);

  const workflow = await readFile(qualityWorkflowUrl, "utf8");
  assert.match(workflow, /^name: quality$/m);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^  workflow_dispatch:$/m);
  assert.match(workflow, /uses: actions\/checkout@v4/);
  assert.match(workflow, /uses: actions\/setup-node@v4/);
  assert.match(workflow, /node-version:\s*\$\{\{\s*matrix\.node-version\s*\}\}/);
  assert.match(workflow, /- 20\.x/);
  assert.match(workflow, /run: bash scripts\/quality-gate\.sh/);
  assert.doesNotMatch(workflow, /codex login|codex exec|@openai\/codex/);
});

test("quality gate docs describe CI limits and manual validation", async () => {
  const docs = await readFile(qualityGateDocsUrl, "utf8");
  assert.match(docs, /## GitHub Actions CI/);
  assert.match(docs, /does not install Pi/);
  assert.match(docs, /real Codex CLI/);
  assert.match(docs, /MANUAL_VALIDATION\.md/);
});
