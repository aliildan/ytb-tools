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

  live(
    "paginates past a single page for large limits",
    async () => {
      const results = await searchVideos("javascript tutorial", { limit: 40 });
      // A single search page is ~20 items; >20 proves continuation paging works.
      expect(results.length).toBeGreaterThan(20);
      const ids = new Set(results.map((r) => r.videoId));
      expect(ids.size).toBe(results.length); // no duplicates across pages
    },
    60_000,
  );
});
