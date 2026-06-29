import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { slugify, saveTranscript, saveSummary } from "../../src/library/save.js";
import type { Transcript } from "../../src/youtube/types.js";

let dir: string;
let env: NodeJS.ProcessEnv;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "ytb-"));
  env = { YT_OUTPUT_DIR: dir };
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

const sample: Transcript = {
  videoId: "abc12345678",
  title: "Hello World",
  language: "en",
  availableLanguages: ["en"],
  segments: [{ startSeconds: 0, text: "hi" }],
  fullText: "hi",
};

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });
  it("falls back to untitled", () => {
    expect(slugify("***")).toBe("untitled");
  });
});

describe("saveTranscript", () => {
  it("writes json and txt into transcripts/", async () => {
    const { jsonPath, txtPath } = await saveTranscript(sample, env);
    expect(jsonPath).toBe(path.join(dir, "transcripts", "abc12345678.en.json"));
    const json = JSON.parse(await fs.readFile(jsonPath, "utf8")) as Transcript;
    expect(json.fullText).toBe("hi");
    expect(await fs.readFile(txtPath, "utf8")).toBe("hi");
  });
});

describe("saveSummary", () => {
  it("writes markdown with frontmatter into summaries/", async () => {
    const file = await saveSummary(
      "abc12345678",
      "A summary.",
      { title: "Hello World", url: "https://x", model: "claude-sonnet-4-6", language: "en", style: "standard" },
      env,
    );
    expect(file).toBe(path.join(dir, "summaries", "abc12345678.standard.md"));
    const md = await fs.readFile(file, "utf8");
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("model: claude-sonnet-4-6");
    expect(md).toContain("language: en");
    expect(md).toContain("A summary.");
  });
});
