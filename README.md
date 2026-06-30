# ytb-tools

A keyless [MCP](https://modelcontextprotocol.io) server for working with YouTube:

- **`youtube_search`** — search and return ranked video results.
- **`youtube_get_transcript`** — extract a video's transcript (with language selection), auto-saved to a local library.
- **`youtube_save_summary`** — persist a host-generated summary as Markdown.

It ships both as a **Claude Code plugin** (with `/yt-search`, `/yt-transcript`, `/yt-summary` slash commands) and as a **standalone MCP server** for any client (Claude Desktop, Cursor, Cline, …).

No API keys are required. Search uses the keyless [`youtubei.js`](https://github.com/LuanRT/YouTube.js) library. Transcripts use [yt-dlp](https://github.com/yt-dlp/yt-dlp), which the server **auto-provisions** — it prefers a system `yt-dlp` (or `YT_DLP_PATH`) and otherwise downloads the official standalone binary into its cache on first use, running it with the Node that already runs the server (no Python or Deno needed).

> **Why yt-dlp for transcripts?** As of 2026, YouTube's PO-token / `exp=xpe` clampdown makes keyless transcript fetching infeasible (the `get_transcript` endpoint 400s and caption URLs return empty bodies, even with a generated PO token or a headless browser). yt-dlp is the only path that reliably extracts arbitrary transcripts, so the server automates its setup.

## Use as a standalone MCP server (Claude Desktop, Cursor, …)

Add to your client's MCP config:

```json
{
  "mcpServers": {
    "ytb-tools": {
      "command": "npx",
      "args": ["-y", "ytb-tools"]
    }
  }
}
```

Then ask in natural language ("search YouTube for…", "get the transcript of…", "summarize this video…") and the client calls the tools.

## Use as a Claude Code plugin

Install the plugin (it bundles the MCP server and the slash commands), then:

- `/yt-search <query>` — list ranked results.
- `/yt-transcript <url|id> [lang]` — fetch a transcript.
- `/yt-summary <url|id> [quick|standard|detailed]` — summarize at a chosen depth. In Claude Code, the summary is written by a subagent on the model matched to the depth (quick → Haiku, standard → Sonnet, detailed → Opus), in the transcript's language.

## Tools

| Tool | Input | Output |
|---|---|---|
| `youtube_search` | `query`, `limit` (default 10), `type` (`video`\|`channel`\|`playlist`) | ranked results with title, channel, duration, views, URL |
| `youtube_get_transcript` | `video` (URL or ID), `lang?` (BCP-47), `fresh?` | `{ videoId, title, language, availableLanguages, segments, fullText }` |
| `youtube_save_summary` | `videoId`, `summary`, `style`, `title`, `url`, `model`, `language` | `{ savedTo }` |

## Library & cache

Transcripts and summaries auto-save to a cross-platform library (default `~/ytb-tools/`, override `YT_OUTPUT_DIR`):

- `transcripts/{videoId}.{lang}.json` + `.txt`
- `summaries/{videoId}.{style}.md` (with YAML frontmatter)

A transcript cache lives in the OS cache dir (override `YT_CACHE_DIR`); the auto-downloaded yt-dlp binary lives under `<cache>/bin/`.

## Configuration (env)

| Variable | Purpose |
|---|---|
| `YT_OUTPUT_DIR` | Library location (default `~/ytb-tools`) |
| `YT_CACHE_DIR` | Cache location (default OS cache dir) |
| `YT_DLP_PATH` | Path to an existing yt-dlp binary (skips auto-download) |

## Development

```bash
npm install
npm test        # unit tests; network-gated live tests run with YT_LIVE=1
npm run build   # compile to dist/
```

## License

MIT
