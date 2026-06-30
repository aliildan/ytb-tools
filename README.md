# 🎬 ytb-tools

[![npm version](https://img.shields.io/npm/v/ytb-tools.svg)](https://www.npmjs.com/package/ytb-tools)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Search YouTube, pull transcripts, and get AI summaries — right inside Claude and any other MCP client.**

ytb-tools is a [Model Context Protocol](https://modelcontextprotocol.io) server that turns YouTube into something your AI assistant can actually work with. Ask it to find videos, grab a transcript, or summarize a talk — it just works.

> ✨ **Zero setup.** No API keys. No Google account. No manual installs. ytb-tools provisions everything it needs on its own.

---

## What you can do

- 🔎 **Search YouTube** — "find me the top React 19 talks" → ranked results with titles, channels, durations, and views.
- 📝 **Get transcripts** — full transcripts in the video's language (or any available caption track), saved to a tidy local library.
- 🧠 **Summarize videos** — TL;DR, structured notes, or a deep dive — written by Claude, in the video's own language.
- 💾 **Builds your library** — every transcript and summary is auto-saved as clean files you can browse, search, and keep.

---

## Quick start

### Any MCP client (Claude Desktop, Cursor, Cline, …)

Add this to your client's MCP config — that's the whole install:

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

Then just ask:

> *"Search YouTube for the best intro to Rust, then summarize the top result."*

### Claude Code

Install the plugin and you get three slash commands on top of the tools:

| Command | What it does |
|---|---|
| `/yt-search <query>` | List ranked search results |
| `/yt-transcript <url\|id> [lang]` | Fetch a transcript |
| `/yt-summary <url\|id> [quick\|standard\|detailed]` | Summarize at the depth you want |

`/yt-summary` automatically picks the right model for the job — **quick → Haiku**, **standard → Sonnet**, **detailed → Opus** — and writes the summary in the video's language.

---

## Your library

Everything is saved automatically (default `~/ytb-tools/`):

```
~/ytb-tools/
├── transcripts/
│   ├── dQw4w9WgXcQ.en.json      # timestamped segments
│   └── dQw4w9WgXcQ.en.txt       # plain text
└── summaries/
    └── dQw4w9WgXcQ.standard.md  # Markdown with title, url, model, date
```

Want them somewhere else? Set `YT_OUTPUT_DIR`.

---

## The tools

| Tool | Does |
|---|---|
| `youtube_search` | Search YouTube and return ranked video results |
| `youtube_get_transcript` | Extract a transcript (with language selection), auto-saved |
| `youtube_save_summary` | Save a generated summary to your library |

---

## Configuration

All optional:

| Variable | Purpose | Default |
|---|---|---|
| `YT_OUTPUT_DIR` | Where transcripts & summaries are saved | `~/ytb-tools` |
| `YT_CACHE_DIR` | Cache location | OS cache dir |
| `YT_DLP_PATH` | Use an existing yt-dlp instead of the bundled one | auto |

---

## How it works (the short version)

Search runs entirely in-process via [`youtubei.js`](https://github.com/LuanRT/YouTube.js) — no key, no quotas. Transcripts are powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp), which ytb-tools **downloads and manages for you automatically** the first time you need it (it reuses the Node runtime that's already running — no Python, no Deno). Summaries are written by your assistant's own model, so there's no extra API bill.

---

## License

MIT © aliildan
