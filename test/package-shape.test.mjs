import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const packageJsonUrl = new URL("../package.json", import.meta.url);
const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

test("package declares the Pi extension entrypoint", () => {
  assert.deepEqual(packageJson.pi?.extensions, ["./extensions/codex-web-search.ts"]);
});

test("placeholder extension source exists", () => {
  assert.equal(existsSync(new URL("../extensions/codex-web-search.ts", import.meta.url)), true);
});

test("initial npm scripts map to the quality gate", () => {
  assert.equal(typeof packageJson.scripts?.typecheck, "string");
  assert.equal(typeof packageJson.scripts?.test, "string");
  assert.equal(typeof packageJson.scripts?.build, "string");
  assert.equal(typeof packageJson.scripts?.["pack:check"], "string");
});
