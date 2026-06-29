import { describe, it, expect } from "vitest";
import { searchVideos } from "../../src/youtube/search.js";

const live = process.env.YT_LIVE ? it : it.skip;

describe("searchVideos (live)", () => {
  live(
    "returns results for a common query",
    async () => {
      const results = await searchVideos("lofi hip hop", { limit: 5 });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].videoId).toMatch(/^[a-zA-Z0-9_-]{11}$/);
      expect(results[0].url).toContain("watch?v=");
    },
    30_000,
  );
});
