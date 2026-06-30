#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { searchInput, handleSearch } from "./tools/search.js";
import { transcriptInput, handleTranscript } from "./tools/transcript.js";
import { saveSummaryInput, handleSaveSummary } from "./tools/saveSummary.js";

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const server = new McpServer({ name: "ytb-tools", version: "0.1.0" });

server.registerTool(
  "youtube_search",
  { description: "Search YouTube and return ranked video results.", inputSchema: searchInput },
  async (args) => {
    try {
      return ok(await handleSearch(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "youtube_get_transcript",
  {
    description:
      "Fetch a video's transcript via yt-dlp (cache-aware) and auto-save it to the library. " +
      "May trigger a one-time yt-dlp download on first use.",
    inputSchema: transcriptInput,
  },
  async (args) => {
    try {
      return ok(await handleTranscript(args));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "youtube_save_summary",
  {
    description: "Persist a host-generated summary to the library as Markdown with frontmatter.",
    inputSchema: saveSummaryInput,
  },
  async (args) => {
    try {
      return ok(await handleSaveSummary(args));
    } catch (e) {
      return fail(e);
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
