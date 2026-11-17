// Agrega a .env.local los secretos compartidos que falten (nunca sobrescribe ni imprime valores):
// INTERNAL_API_SECRET (herramienta interna, §3.4) y NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (R04).
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

const file = path.resolve(import.meta.dirname, "../.env.local");
const current = existsSync(file) ? readFileSync(file, "utf8") : "";
const generators = {
  INTERNAL_API_SECRET: () => randomBytes(32).toString("hex"),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: () => randomBytes(32).toString("base64"),
};

const added = [];
let block = "";
for (const [name, generate] of Object.entries(generators)) {
  if (new RegExp(`^${name}=`, "m").test(current)) continue;
  block += `${name}=${generate()}\n`;
  added.push(name);
}
if (block) {
  appendFileSync(file, `${current.endsWith("\n") || !current ? "" : "\n"}${block}`, {
    mode: 0o600,
  });
}
console.log(added.length ? `Agregadas a .env.local: ${added.join(", ")}` : "Nada que agregar.");
