import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

export async function loadTsProjectModule(entryUrl) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "pi-codex-web-search-ts-"));

  try {
    await writeFile(path.join(tempRoot, "package.json"), '{"type":"module"}\n', "utf8");
    await transpileTree(path.join(REPO_ROOT, "src"), path.join(tempRoot, "src"));
    await transpileTree(path.join(REPO_ROOT, "extensions"), path.join(tempRoot, "extensions"));

    const entryPath = fileURLToPath(entryUrl);
    const relativeEntry = path.relative(REPO_ROOT, entryPath).replace(/\.ts$/, ".js");
    const moduleUrl = pathToFileURL(path.join(tempRoot, relativeEntry));

    return await import(moduleUrl.href);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function transpileTree(sourceDir, outputDir) {
  await mkdir(outputDir, { recursive: true });

  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const outputPath = path.join(outputDir, entry.name);

    if (entry.isDirectory()) {
      await transpileTree(sourcePath, outputPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) {
      continue;
    }

    const outputFilePath = outputPath.replace(/\.ts$/, ".js");
    await transpileFile(sourcePath, outputFilePath);
  }
}

async function transpileFile(sourcePath, outputPath) {
  const source = await readFile(sourcePath, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: sourcePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
      verbatimModuleSyntax: true,
    },
  });

  if (diagnostics.length > 0) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => "\n",
    });
    throw new Error(`Failed to transpile ${sourcePath}:\n${formatted}`);
  }

  await writeFile(outputPath, outputText, "utf8");
}
