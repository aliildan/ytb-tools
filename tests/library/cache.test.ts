import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { readCachedTranscript, writeCachedTranscript } from "../../src/library/cache.js";
import type { Transcript } from "../../src/youtube/types.js";

let dir: string;
let env: NodeJS.ProcessEnv;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "ytb-cache-"));
  env = { YT_CACHE_DIR: dir };
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const sample: Transcript = {
  videoId: "abc12345678",
  title: "T",
  language: "en",
  availableLanguages: ["en"],
  segments: [{ startSeconds: 0, text: "hi" }],
  fullText: "hi",
};

describe("transcript cache", () => {
  it("returns null on a miss", async () => {
    expect(await readCachedTranscript("nope", "auto", env)).toBeNull();
  });
  it("round-trips a write then read by key", async () => {
    await writeCachedTranscript(sample, "auto", env);
    const got = await readCachedTranscript("abc12345678", "auto", env);
    expect(got?.fullText).toBe("hi");
  });
  it("keys are independent", async () => {
    await writeCachedTranscript(sample, "auto", env);
    expect(await readCachedTranscript("abc12345678", "tr", env)).toBeNull();
  });
});
