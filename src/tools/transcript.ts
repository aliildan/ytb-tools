import { z } from "zod";
import { parseVideoId } from "../youtube/url.js";
import { fetchTranscript } from "../youtube/transcript.js";
import { readCachedTranscript, writeCachedTranscript } from "../library/cache.js";
import { saveTranscript } from "../library/save.js";
import type { Transcript } from "../youtube/types.js";

export const transcriptInput = {
  video: z.string().min(1).describe("YouTube URL or 11-character video ID"),
  lang: z.string().optional().describe("BCP-47 language code, e.g. en, tr"),
  fresh: z.boolean().default(false).describe("Bypass the transcript cache"),
};

interface Deps {
  fetch?: (videoId: string, lang?: string) => Promise<Transcript>;
  readCache?: (videoId: string, key: string) => Promise<Transcript | null>;
  writeCache?: (t: Transcript, key: string) => Promise<void>;
  save?: (t: Transcript) => Promise<{ jsonPath: string; txtPath: string }>;
}

export async function handleTranscript(
  args: { video: string; lang?: string; fresh?: boolean },
  deps: Deps = {},
): Promise<Transcript> {
  const fetch = deps.fetch ?? fetchTranscript;
  const readCache = deps.readCache ?? ((id, key) => readCachedTranscript(id, key));
  const writeCache = deps.writeCache ?? ((t, key) => writeCachedTranscript(t, key));
  const save = deps.save ?? ((t) => saveTranscript(t));

  const videoId = parseVideoId(args.video);
  const key = args.lang ?? "auto";

  if (!args.fresh) {
    const cached = await readCache(videoId, key);
    if (cached) return cached;
  }

  const t = await fetch(videoId, args.lang);
  await writeCache(t, key);
  await save(t);
  return t;
}
