import os from "node:os";
import path from "node:path";
import envPaths from "env-paths";

export function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export function outputDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.YT_OUTPUT_DIR?.trim();
  if (override) return path.resolve(expandHome(override));
  return path.join(os.homedir(), "ytb-tools");
}

export function cacheDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.YT_CACHE_DIR?.trim();
  if (override) return path.resolve(expandHome(override));
  return envPaths("ytb-tools", { suffix: "" }).cache;
}

export function transcriptsDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(outputDir(env), "transcripts");
}

export function summariesDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(outputDir(env), "summaries");
}
