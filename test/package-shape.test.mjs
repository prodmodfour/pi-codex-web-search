import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJsonUrl = new URL("../package.json", import.meta.url);
const qualityGateDocsUrl = new URL("../docs/QUALITY_GATE.md", import.meta.url);
const manualValidationDocsUrl = new URL("../docs/MANUAL_VALIDATION.md", import.meta.url);
const localPiProjectExampleDocsUrl = new URL("../docs/EXAMPLE_LOCAL_PI_PROJECT.md", import.meta.url);
const qualityGateScriptUrl = new URL("../scripts/quality-gate.sh", import.meta.url);
const realCodexSmokeScriptUrl = new URL("../scripts/smoke-real-codex-search.mjs", import.meta.url);
const qualityWorkflowUrl = new URL("../.github/workflows/quality.yml", import.meta.url);
const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

test("package declares the Pi extension entrypoint", () => {
  assert.deepEqual(packageJson.pi?.extensions, ["./extensions/codex-web-search.ts"]);
});

test("extension source exists", () => {
  assert.equal(existsSync(new URL("../extensions/codex-web-search.ts", import.meta.url)), true);
});

test("package declares expected npm scripts", () => {
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
    "smoke:codex",
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

test("real Codex smoke script is opt-in and documented", async () => {
  assert.equal(existsSync(realCodexSmokeScriptUrl), true);
  assert.match(packageJson.scripts["smoke:codex"], /scripts\/smoke-real-codex-search\.mjs/);

  const qualityGate = await readFile(qualityGateScriptUrl, "utf8");
  assert.doesNotMatch(qualityGate, /smoke:codex|smoke-real-codex-search/);

  const script = await readFile(realCodexSmokeScriptUrl, "utf8");
  assert.match(script, /spawn\(/);
  assert.match(script, /shell:\s*false/);
  assert.match(script, /"--search"/);
  assert.match(script, /"--sandbox"/);
  assert.match(script, /"read-only"/);
  assert.match(script, /current UTC date/);
  assert.match(script, /writes no log files/);
  assert.match(script, /Raw stderr\/stdout from failed Codex runs is intentionally omitted/);

  const manualValidationDocs = await readFile(manualValidationDocsUrl, "utf8");
  assert.match(manualValidationDocs, /npm run smoke:codex/);
  assert.match(manualValidationDocs, /not part of the automated quality gate/);
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
