import { describe, it, expect } from "vitest";
import { normalizeSearchResults } from "../../src/youtube/search.js";

describe("normalizeSearchResults", () => {
  it("maps known fields and builds a watch URL", () => {
    const raw = [
      {
        id: "abc12345678",
        title: { text: "My Video" },
        author: { name: "Some Channel" },
        duration: { seconds: 215 },
        view_count: { text: "1.2M views" },
        published: { text: "2 years ago" },
        description_snippet: { text: "a snippet" },
      },
    ];
    const [r] = normalizeSearchResults(raw as any, 10);
    expect(r.videoId).toBe("abc12345678");
    expect(r.title).toBe("My Video");
    expect(r.channel).toBe("Some Channel");
    expect(r.durationSeconds).toBe(215);
    expect(r.viewCount).toBe(1_200_000);
    expect(r.publishedAt).toBe("2 years ago");
    expect(r.url).toBe("https://www.youtube.com/watch?v=abc12345678");
    expect(r.descriptionSnippet).toBe("a snippet");
  });

  it("skips entries without an id and respects limit", () => {
    const raw = [{ title: { text: "no id" } }, { id: "abc12345678" }, { id: "def12345678" }];
    const out = normalizeSearchResults(raw as any, 1);
    expect(out).toHaveLength(1);
    expect(out[0].videoId).toBe("abc12345678");
  });

  it("tolerates missing optional fields", () => {
    const [r] = normalizeSearchResults([{ id: "abc12345678" }] as any, 10);
    expect(r.viewCount).toBeNull();
    expect(r.durationSeconds).toBeNull();
    expect(r.channel).toBe("");
  });
});
