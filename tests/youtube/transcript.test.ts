import { describe, it, expect } from "vitest";
import { parseJson3, buildFullText, pickLanguage } from "../../src/youtube/transcript.js";

describe("parseJson3", () => {
  it("joins segs and converts tStartMs to seconds", () => {
    const data = {
      events: [
        { tStartMs: 0, segs: [{ utf8: "Hello " }, { utf8: "world" }] },
        { tStartMs: 2500, segs: [{ utf8: "again" }] },
      ],
    };
    expect(parseJson3(data)).toEqual([
      { startSeconds: 0, text: "Hello world" },
      { startSeconds: 3, text: "again" },
    ]);
  });
  it("drops empty/whitespace events", () => {
    const data = { events: [{ tStartMs: 100, segs: [{ utf8: "\n" }] }, { tStartMs: 200 }] };
    expect(parseJson3(data)).toHaveLength(0);
  });
  it("tolerates missing events", () => {
    expect(parseJson3({})).toEqual([]);
  });
});

describe("buildFullText", () => {
  it("joins and collapses whitespace", () => {
    expect(buildFullText([{ startSeconds: 0, text: "a" }, { startSeconds: 1, text: "b" }])).toBe("a b");
  });
});

describe("pickLanguage", () => {
  it("prefers the requested language", () => {
    expect(pickLanguage("tr", "en", ["en", "tr", "de"])).toBe("tr");
  });
  it("matches a regional/orig variant of the requested", () => {
    expect(pickLanguage("en", undefined, ["en-orig", "de"])).toBe("en-orig");
  });
  it("falls back to metadata language", () => {
    expect(pickLanguage(undefined, "de", ["en", "de"])).toBe("de");
  });
  it("falls back to english then first", () => {
    expect(pickLanguage(undefined, undefined, ["en", "fr"])).toBe("en");
    expect(pickLanguage(undefined, undefined, ["fr", "es"])).toBe("fr");
  });
});
