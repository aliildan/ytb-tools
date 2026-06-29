import { describe, it, expect } from "vitest";
import os from "node:os";
import path from "node:path";
import { expandHome, outputDir, transcriptsDir, summariesDir, cacheDir } from "../../src/library/paths.js";

describe("expandHome", () => {
  it("expands a leading ~/", () => {
    expect(expandHome("~/foo")).toBe(path.join(os.homedir(), "foo"));
  });
  it("leaves absolute paths untouched", () => {
    expect(expandHome("/tmp/foo")).toBe("/tmp/foo");
  });
});

describe("outputDir", () => {
  it("defaults to homedir/ytb-tools", () => {
    expect(outputDir({})).toBe(path.join(os.homedir(), "ytb-tools"));
  });
  it("honors YT_OUTPUT_DIR with ~ expansion", () => {
    expect(outputDir({ YT_OUTPUT_DIR: "~/vids" })).toBe(path.join(os.homedir(), "vids"));
  });
  it("derives transcripts/ and summaries/", () => {
    const base = path.join(os.homedir(), "ytb-tools");
    expect(transcriptsDir({})).toBe(path.join(base, "transcripts"));
    expect(summariesDir({})).toBe(path.join(base, "summaries"));
  });
});

describe("cacheDir", () => {
  it("honors YT_CACHE_DIR override", () => {
    expect(cacheDir({ YT_CACHE_DIR: "/tmp/c" })).toBe(path.resolve("/tmp/c"));
  });
  it("returns a non-empty default", () => {
    expect(cacheDir({}).length).toBeGreaterThan(0);
  });
});
