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
  it(".mcp.json launches the server via npx", async () => {
    const c = await readJson(".mcp.json");
    expect(c.mcpServers["ytb-tools"].command).toBe("npx");
    expect(c.mcpServers["ytb-tools"].args).toContain("ytb-tools");
  });
  it("ships the three slash commands", async () => {
    for (const f of ["yt-search.md", "yt-transcript.md", "yt-summary.md"]) {
      await expect(fs.access(`commands/${f}`)).resolves.toBeUndefined();
    }
  });
  it("exposes a marketplace manifest listing the plugin", async () => {
    const m = await readJson(".claude-plugin/marketplace.json");
    expect(m.name).toBe("ytb-tools");
    expect(m.plugins.map((p: { name: string }) => p.name)).toContain("ytb-tools");
  });
  it("ships the yt-research skill with a name in frontmatter", async () => {
    const skill = await fs.readFile("skills/yt-research/SKILL.md", "utf8");
    expect(skill).toMatch(/^---/);
    expect(skill).toContain("name: yt-research");
  });
});
