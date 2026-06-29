import type { SearchResult } from "./types.js";
import { watchUrl } from "./url.js";
import { getInnertube } from "./client.js";

// Defensive subset of the youtubei.js video node shape we read from.
interface RawVideo {
  id?: string;
  video_id?: string;
  title?: { text?: string } | string;
  author?: { name?: string } | string;
  duration?: { seconds?: number; text?: string };
  view_count?: { text?: string };
  short_view_count?: { text?: string };
  published?: { text?: string };
  description_snippet?: { text?: string };
}

function txt(v: { text?: string } | { name?: string } | string | undefined): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if ("text" in v && typeof v.text === "string") return v.text;
  if ("name" in v && typeof v.name === "string") return v.name;
  return "";
}

function parseViewCount(s: string): number | null {
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*([KMB]?)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (Number.isNaN(n)) return null;
  const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };
  return Math.round(n * (mult[m[2].toUpperCase()] ?? 1));
}

export function normalizeSearchResults(raw: RawVideo[], limit: number): SearchResult[] {
  const out: SearchResult[] = [];
  for (const v of raw) {
    const videoId = v.id ?? v.video_id;
    if (!videoId) continue;
    out.push({
      videoId,
      title: txt(v.title),
      channel: txt(v.author),
      durationSeconds: v.duration?.seconds ?? null,
      viewCount: parseViewCount(txt(v.view_count) || txt(v.short_view_count)),
      publishedAt: txt(v.published) || null,
      url: watchUrl(videoId),
      descriptionSnippet: txt(v.description_snippet),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchVideos(
  query: string,
  opts: { limit?: number; type?: "video" | "channel" | "playlist" } = {},
): Promise<SearchResult[]> {
  const yt = await getInnertube();
  const res = (await yt.search(query, { type: opts.type ?? "video" })) as unknown as {
    results?: RawVideo[];
    videos?: RawVideo[];
  };
  const raw = res.results ?? res.videos ?? [];
  return normalizeSearchResults(raw, opts.limit ?? 10);
}
