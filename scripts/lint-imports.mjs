// Lintea fragmentos de código como si vivieran en una ruta del repo y reporta los imports prohibidos.
// Entrada (stdin): [{ "filePath": "packages/ui/src/atoms/X.tsx", "code": "import …" }]
// Salida (stdout): [{ "filePath": "…", "errors": ["mensaje", …] }]
// Corre fuera del runner de Playwright porque los plugins de ESLint no cargan bajo su transformador.
import { readFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const root = path.resolve(import.meta.dirname, "..");
const cases = JSON.parse(readFileSync(0, "utf8"));
const eslint = new ESLint({ cwd: root });

const output = [];
for (const { filePath, code } of cases) {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, filePath) });
  output.push({
    filePath,
    errors: (result?.messages ?? [])
      .filter((m) => m.ruleId === "no-restricted-imports")
      .map((m) => m.message),
  });
}
process.stdout.write(JSON.stringify(output));
