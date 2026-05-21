#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const packageJsonPath = resolve(repoRoot, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const EXPECTED_FILES_ALLOWLIST = ["extensions", "src", "docs", "README.md"];
const REQUIRED_PACKED_FILES = [
  "package.json",
  "README.md",
  "extensions/codex-web-search.ts",
  "src/index.ts",
  "docs/ARCHITECTURE.md",
  "docs/EXAMPLE_LOCAL_PI_PROJECT.md",
  "docs/EXTENSION_SPEC.md",
  "docs/INSTALLATION.md",
  "docs/MANUAL_VALIDATION.md",
  "docs/QUALITY_GATE.md",
  "docs/RELEASE.md",
  "docs/SECURITY.md",
  "docs/TROUBLESHOOTING.md",
  "docs/USAGE.md",
];

const ALLOWED_PACKAGE_PATHS = [
  /^package\.json$/,
  /^README\.md$/,
  /^extensions\//,
  /^src\//,
  /^docs\//,
];

const FORBIDDEN_PACKAGE_PATHS = [
  { pattern: /(^|\/)node_modules(\/|$)/, reason: "dependencies must not be packed" },
  { pattern: /(^|\/)dist(\/|$)/, reason: "build output must not be packed" },
  { pattern: /(^|\/)build(\/|$)/, reason: "build output must not be packed" },
  { pattern: /(^|\/)coverage(\/|$)/, reason: "coverage output must not be packed" },
  { pattern: /(^|\/)\.agent(\/|$)/, reason: "agent logs must not be packed" },
  { pattern: /(^|\/)\.pi(\/|$)/, reason: "local Pi runtime state must not be packed" },
  { pattern: /(^|\/)\.codex(\/|$)/, reason: "Codex auth/runtime state must not be packed" },
  { pattern: /(^|\/)auth\.json$/, reason: "Codex auth files must not be packed" },
  { pattern: /(^|\/)\.env($|\.)/, reason: "environment files must not be packed" },
  { pattern: /(^|\/)[^/]+\.tgz$/, reason: "package tarballs must not be repacked" },
  { pattern: /^test\//, reason: "test fixtures are not runtime package contents" },
  { pattern: /^scripts\//, reason: "release/automation scripts are not runtime package contents" },
  { pattern: /^BUILD_/, reason: "autonomous build notes are not runtime package contents" },
  { pattern: /^AGENTS\.md$/, reason: "agent instructions are not runtime package contents" },
  { pattern: /^PROJECT_BRIEF\.md$/, reason: "project brief is not runtime package contents" },
];

function fail(message) {
  console.error(`Package contents check failed: ${message}`);
  process.exit(1);
}

function normalizeManifestPath(path) {
  return path.replace(/^\.\//, "");
}

function parsePackJson(stdout) {
  const trimmed = stdout.trim();

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw error;
  }
}

function assertPackageMetadata() {
  if (packageJson.private === true) {
    fail("package.json is marked private; release validation expects a publishable package");
  }

  if (JSON.stringify(packageJson.files) !== JSON.stringify(EXPECTED_FILES_ALLOWLIST)) {
    fail(`package.json files allowlist must be exactly ${JSON.stringify(EXPECTED_FILES_ALLOWLIST)}`);
  }

  const extensions = packageJson.pi?.extensions;
  if (!Array.isArray(extensions) || extensions.length === 0) {
    fail("package.json must declare at least one pi.extensions entrypoint");
  }
}

function runNpmPackDryRun() {
  const npmBinary = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(npmBinary, ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });

  if (result.error) {
    fail(`could not run npm pack --dry-run: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const stderr = result.stderr.trim();
    fail(`npm pack --dry-run exited with status ${result.status}${stderr ? `: ${stderr}` : ""}`);
  }

  let entries;
  try {
    entries = parsePackJson(result.stdout);
  } catch (error) {
    fail(`could not parse npm pack --json output: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(entries) || entries.length !== 1) {
    fail("npm pack --json output should contain exactly one package entry");
  }

  return entries[0];
}

function assertPackedFiles(packEntry) {
  if (packEntry.name !== packageJson.name || packEntry.version !== packageJson.version) {
    fail("npm pack output package name/version does not match package.json");
  }

  const files = (packEntry.files ?? []).map((file) => file.path).sort();
  if (files.length === 0) {
    fail("npm pack dry-run did not report any files");
  }

  const packedFileSet = new Set(files);

  for (const requiredFile of REQUIRED_PACKED_FILES) {
    if (!packedFileSet.has(requiredFile)) {
      fail(`required package file is missing from dry-run output: ${requiredFile}`);
    }
  }

  for (const entrypoint of packageJson.pi.extensions.map(normalizeManifestPath)) {
    if (!packedFileSet.has(entrypoint)) {
      fail(`pi.extensions entrypoint is missing from package contents: ${entrypoint}`);
    }
  }

  for (const path of files) {
    if (!ALLOWED_PACKAGE_PATHS.some((pattern) => pattern.test(path))) {
      fail(`unexpected package path outside the allowlist: ${path}`);
    }

    for (const forbidden of FORBIDDEN_PACKAGE_PATHS) {
      if (forbidden.pattern.test(path)) {
        fail(`forbidden package path ${path}: ${forbidden.reason}`);
      }
    }
  }

  console.log(`Package dry-run: ${packEntry.name}@${packEntry.version}`);
  console.log(`Tarball filename (not created): ${packEntry.filename}`);
  console.log(`Packed files: ${files.length}`);
  console.log(`Unpacked size: ${packEntry.unpackedSize ?? "unknown"} bytes`);
  console.log("Included files:");
  for (const path of files) {
    console.log(`- ${path}`);
  }
  console.log("Package contents check passed.");
}

assertPackageMetadata();
assertPackedFiles(runNpmPackDryRun());
