// Regenera docs/rendering-map.txt con la tabla de rutas del último `next build`.
// Uso: `pnpm rendering:map`. El archivo queda trackeado: `git diff docs/rendering-map.txt`
// muestra cómo cambió el modo de render de cada ruta entre commits.
import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const build = spawnSync("pnpm", ["--filter", "@nudo/web", "build"], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});

const output = `${build.stdout ?? ""}${build.stderr ?? ""}`.replaceAll(/\u001b\[[0-9;]*m/g, "");

if (build.status !== 0) {
  console.error(output);
  process.exit(build.status ?? 1);
}

const lines = output.split("\n");
const start = lines.findIndex((l) => l.includes("Route (app)"));
const end = lines.findIndex((l) => l.includes("server-rendered on demand"));

if (start === -1 || end === -1 || end <= start) {
  console.error("No se encontró la tabla de rutas en la salida del build.");
  process.exit(1);
}

const head = [
  `# rendering map — ${execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim()} — ${new Date().toISOString()}`,
  "# Regenerar: pnpm rendering:map · leyenda: ○ estático · ◐ partial prerender · ƒ dinámico",
  "",
];

writeFileSync(
  path.join(root, "docs/rendering-map.txt"),
  `${head.join("\n")}${lines.slice(start, end + 1).join("\n")}\n`,
);
console.log("docs/rendering-map.txt actualizado.");
