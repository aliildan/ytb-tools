import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

describe("plugin packaging", () => {
  it("plugin.json has the right name", async () => {
    const m = await readJson(".claude-plugin/plugin.json");
    expect(m.name).toBe("ytb-tools");
  });
  it(".mcp.json launches the built server", async () => {
    const c = await readJson(".mcp.json");
    expect(c.mcpServers["ytb-tools"].command).toBe("node");
    expect(c.mcpServers["ytb-tools"].args[0]).toContain("dist/index.js");
  });
  it("ships the three slash commands", async () => {
    for (const f of ["yt-search.md", "yt-transcript.md", "yt-summary.md"]) {
      await expect(fs.access(`commands/${f}`)).resolves.toBeUndefined();
    }
  });
});
