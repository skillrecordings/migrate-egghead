/**
 * Environment loading utility
 *
 * Uses dotenv-flow for environment cascading:
 * .env.local (gitignored, local overrides)
 * .env.development / .env.production (per-environment)
 * .env (shared defaults)
 */
import dotenvFlow from "dotenv-flow";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load environment variables using dotenv-flow
 *
 * Loads from investigation root with proper cascading
 */
export const loadEnv = (): void => {
  const envPath = resolve(__dirname, "../..");
  dotenvFlow.config({ path: envPath });
};
