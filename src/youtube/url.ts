const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export function parseVideoId(input: string): string {
  const s = input.trim();
  if (ID_RE.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (ID_RE.test(id)) return id;
    }
    if (u.hostname.endsWith("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && ID_RE.test(v)) return v;
      const m = u.pathname.match(/\/(shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL — fall through */
  }
  throw new Error(`Could not parse a YouTube video ID from: ${input}`);
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
