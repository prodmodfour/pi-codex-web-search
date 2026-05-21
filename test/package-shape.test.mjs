import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJsonUrl = new URL("../package.json", import.meta.url);
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
