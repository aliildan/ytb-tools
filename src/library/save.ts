import { promises as fs } from "node:fs";
import path from "node:path";
import { transcriptsDir, summariesDir } from "./paths.js";
import type { Transcript } from "../youtube/types.js";

export function slugify(s: string): string {
  const out = s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return out || "untitled";
}

export async function saveTranscript(
  t: Transcript,
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ jsonPath: string; txtPath: string }> {
  const dir = transcriptsDir(env);
  await fs.mkdir(dir, { recursive: true });
  const base = `${t.videoId}.${t.language}`;
  const jsonPath = path.join(dir, `${base}.json`);
  const txtPath = path.join(dir, `${base}.txt`);
  await fs.writeFile(jsonPath, JSON.stringify(t, null, 2), "utf8");
  await fs.writeFile(txtPath, t.fullText, "utf8");
  return { jsonPath, txtPath };
}

export interface SummaryMeta {
  title: string;
  url: string;
  model: string;
  language: string;
  style: string;
}

export async function saveSummary(
  videoId: string,
  summary: string,
  meta: SummaryMeta,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const dir = summariesDir(env);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${videoId}.${meta.style}.md`);
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(meta.title)}`,
    `url: ${meta.url}`,
    `videoId: ${videoId}`,
    `model: ${meta.model}`,
    `style: ${meta.style}`,
    `language: ${meta.language}`,
    `date: ${new Date().toISOString()}`,
    "---",
    "",
  ].join("\n");
  await fs.writeFile(file, frontmatter + summary + "\n", "utf8");
  return file;
}
