import { describe, it, expect } from "vitest";
import { fetchTranscript } from "../../src/youtube/transcript.js";

const live = process.env.YT_LIVE ? it : it.skip;

describe("fetchTranscript (live, via yt-dlp)", () => {
  // First run auto-downloads the yt-dlp binary into the cache (~36 MB).
  live(
    "fetches a transcript with segments",
    async () => {
      const t = await fetchTranscript("dQw4w9WgXcQ");
      expect(t.segments.length).toBeGreaterThan(0);
      expect(t.fullText.length).toBeGreaterThan(0);
      expect(typeof t.language).toBe("string");
      expect(t.availableLanguages.length).toBeGreaterThan(0);
    },
    120_000,
  );
});
