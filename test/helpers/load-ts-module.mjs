import { readFile } from "node:fs/promises";
import ts from "typescript";

export async function loadTsModule(sourceUrl) {
  const source = await readFile(sourceUrl, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    fileName: sourceUrl.pathname,
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
    throw new Error(`Failed to transpile ${sourceUrl.pathname}:\n${formatted}`);
  }

  const encoded = Buffer.from(outputText, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}
