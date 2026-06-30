import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { Transcript, TranscriptSegment } from "./types.js";
import { watchUrl } from "./url.js";
import { ensureYtDlp, jsRuntimeArg } from "../ytdlp/provision.js";

interface Json3Event {
  tStartMs?: number;
  segs?: { utf8?: string }[];
}

export function parseJson3(data: unknown): TranscriptSegment[] {
  const events = (data as { events?: Json3Event[] })?.events ?? [];
  const segs: TranscriptSegment[] = [];
  for (const ev of events) {
    const text = (ev.segs ?? []).map((s) => s.utf8 ?? "").join("").trim();
    if (!text) continue;
    segs.push({ startSeconds: Math.round((ev.tStartMs ?? 0) / 1000), text });
  }
  return segs;
}

export function buildFullText(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => s.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickLanguage(
  requested: string | undefined,
  metaLang: string | undefined,
  available: string[],
): string {
  const match = (l?: string) =>
    available.find((a) => a === l) ??
    available.find((a) => !!l && (a.startsWith(l + "-") || a === l + "-orig"));
  return match(requested) ?? match(metaLang) ?? match("en") ?? available[0];
}

function run(bin: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args);
    let stdout = "";
    let stderr = "";
    p.on("error", reject);
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function fetchTranscript(
  videoId: string,
  lang?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Transcript> {
  const bin = await ensureYtDlp(env);
  const url = watchUrl(videoId);
  const jsRt = jsRuntimeArg();

  // 1. Metadata: title + available caption languages.
  const meta = await run(bin, ["-J", "--skip-download", "--no-warnings", "--js-runtimes", jsRt, url]);
  if (meta.code !== 0) throw new Error(`yt-dlp metadata failed for ${videoId}: ${meta.stderr.slice(-200)}`);
  const info = JSON.parse(meta.stdout) as {
    title?: string;
    language?: string;
    subtitles?: Record<string, unknown>;
    automatic_captions?: Record<string, unknown>;
  };
  const available = Array.from(
    new Set([...Object.keys(info.subtitles ?? {}), ...Object.keys(info.automatic_captions ?? {})]),
  );
  if (available.length === 0) throw new Error(`No transcript available for video ${videoId}`);
  const chosen = pickLanguage(lang, info.language, available);

  // 2. Download the chosen track as json3 into a temp dir, then parse.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ytb-tr-"));
  try {
    const dl = await run(bin, [
      "--skip-download",
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      chosen,
      "--sub-format",
      "json3",
      "--no-warnings",
      "--js-runtimes",
      jsRt,
      "-o",
      path.join(dir, "t.%(ext)s"),
      url,
    ]);
    if (dl.code !== 0) throw new Error(`yt-dlp subtitle download failed for ${videoId}: ${dl.stderr.slice(-200)}`);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json3"));
    if (files.length === 0) throw new Error(`No transcript track produced for ${videoId} (lang ${chosen})`);
    const file = files.find((f) => f.includes(`.${chosen}.`)) ?? files[0];
    const json = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
    const segments = parseJson3(json);
    if (segments.length === 0) throw new Error(`Empty transcript for ${videoId}`);
    const m = file.match(/\.([^.]+)\.json3$/);
    const language = m ? m[1] : chosen;
    return {
      videoId,
      title: info.title ?? "",
      language,
      availableLanguages: available,
      segments,
      fullText: buildFullText(segments),
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
