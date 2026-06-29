import { promises as fs } from "node:fs";
import path from "node:path";
import { cacheDir } from "./paths.js";
import type { Transcript } from "../youtube/types.js";

function cacheFile(videoId: string, key: string, env: NodeJS.ProcessEnv): string {
  return path.join(cacheDir(env), "transcripts", `${videoId}.${key}.json`);
}

export async function readCachedTranscript(
  videoId: string,
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Transcript | null> {
  try {
    const raw = await fs.readFile(cacheFile(videoId, key, env), "utf8");
    return JSON.parse(raw) as Transcript;
  } catch {
    return null;
  }
}

export async function writeCachedTranscript(
  t: Transcript,
  key: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  const file = cacheFile(t.videoId, key, env);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(t), "utf8");
}
