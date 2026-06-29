import { describe, it, expect } from "vitest";
import { parseVideoId, watchUrl } from "../../src/youtube/url.js";

describe("parseVideoId", () => {
  it("accepts a bare 11-char id", () => {
    expect(parseVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses watch?v= URLs", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s")).toBe("dQw4w9WgXcQ");
  });
  it("parses youtu.be short links", () => {
    expect(parseVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("parses /shorts/ links", () => {
    expect(parseVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("throws on garbage", () => {
    expect(() => parseVideoId("not a video")).toThrow();
  });
});

describe("watchUrl", () => {
  it("builds a canonical watch URL", () => {
    expect(watchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
