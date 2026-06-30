import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { handleSaveSummary } from "../../src/tools/saveSummary.js";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "ytb-ss-"));
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("handleSaveSummary", () => {
  it("writes the summary and returns the path", async () => {
    const out = await handleSaveSummary(
      {
        videoId: "abc12345678",
        summary: "Body.",
        style: "detailed",
        title: "T",
        url: "https://x",
        model: "claude-opus-4-8",
        language: "en",
      },
      { YT_OUTPUT_DIR: dir },
    );
    expect(out.savedTo).toBe(path.join(dir, "summaries", "abc12345678.detailed.md"));
    expect(await fs.readFile(out.savedTo, "utf8")).toContain("Body.");
  });
});
