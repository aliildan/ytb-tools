import { describe, it, expect } from "vitest";
import { assetName, jsRuntimeArg } from "../../src/ytdlp/provision.js";

describe("assetName", () => {
  it("maps windows", () => expect(assetName("win32", "x64")).toBe("yt-dlp.exe"));
  it("maps macos", () => expect(assetName("darwin", "arm64")).toBe("yt-dlp_macos"));
  it("maps linux x64", () => expect(assetName("linux", "x64")).toBe("yt-dlp_linux"));
  it("maps linux arm64", () => expect(assetName("linux", "arm64")).toBe("yt-dlp_linux_aarch64"));
});

describe("jsRuntimeArg", () => {
  it("points at the current node", () => {
    expect(jsRuntimeArg()).toBe(`node:${process.execPath}`);
  });
});
