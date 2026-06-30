import { describe, it, expect } from "vitest";
import { handleTranscript } from "../../src/tools/transcript.js";
import type { Transcript } from "../../src/youtube/types.js";

const fake: Transcript = {
  videoId: "abc12345678",
  title: "T",
  language: "en",
  availableLanguages: ["en"],
  segments: [{ startSeconds: 0, text: "hi" }],
  fullText: "hi",
};

describe("handleTranscript", () => {
  it("returns cached transcript without fetching", async () => {
    let fetched = false;
    const out = await handleTranscript(
      { video: "https://youtu.be/abc12345678" },
      {
        readCache: async () => fake,
        writeCache: async () => {},
        save: async () => ({ jsonPath: "j", txtPath: "t" }),
        fetch: async () => {
          fetched = true;
          return fake;
        },
      },
    );
    expect(out.fullText).toBe("hi");
    expect(fetched).toBe(false);
  });

  it("fetches, caches, and saves on a miss", async () => {
    const calls: string[] = [];
    const out = await handleTranscript(
      { video: "abc12345678", fresh: true },
      {
        readCache: async () => {
          calls.push("read");
          return null;
        },
        writeCache: async () => {
          calls.push("write");
        },
        save: async () => {
          calls.push("save");
          return { jsonPath: "j", txtPath: "t" };
        },
        fetch: async () => {
          calls.push("fetch");
          return fake;
        },
      },
    );
    expect(out.videoId).toBe("abc12345678");
    // fresh=true skips read; must fetch, write, save
    expect(calls).toEqual(["fetch", "write", "save"]);
  });
});
