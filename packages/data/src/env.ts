import "server-only";

// Variables obligatorias (§3.7). Los nombres son fijos: no crear alias.
const requiredVariables = ["MONGODB_URI", "REDIS_URL"] as const;

type RequiredVariable = (typeof requiredVariables)[number];

export type ServerEnv = Readonly<Record<RequiredVariable, string>>;

let cached: ServerEnv | undefined;

/**
 * Devuelve las variables de entorno del servidor validadas.
 * Falla con un mensaje claro (sin exponer valores) si falta alguna.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const missing = requiredVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno: ${missing.join(", ")}. ` +
        "Definilas en .env.local (raíz del repo) o en el entorno de ejecución.",
    );
  }

  cached = Object.freeze({
    MONGODB_URI: process.env.MONGODB_URI as string,
    REDIS_URL: process.env.REDIS_URL as string,
  });
  return cached;
}
