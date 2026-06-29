# ytb-tools — Design Spec

**Date:** 2026-06-30
**Status:** Approved for planning

## Summary

`ytb-tools` is a Claude Code **plugin** that bundles a **keyless TypeScript MCP
server** for working with YouTube. It lets you search for videos, extract their
transcripts, and produce summaries — with the summary written by your existing
Claude (Claude Code / Claude Desktop), at a model chosen to fit the job.

The MCP server is fully portable: its tools work in any MCP client (Claude Code,
Claude Desktop, Cursor, etc.). The plugin layer adds Claude Code slash commands
as a convenience on top.

No API keys are required anywhere — neither for YouTube (we use the keyless
`youtubei.js` library) nor for summarization (the host Claude does it).

## Goals

- Search YouTube and return clean, ranked results.
- Extract a video's transcript reliably, with language selection.
- Summarize a video using the host's Claude, picking the right model per job.
- Auto-save transcripts and summaries to a browsable, cross-platform library.
- Work as a Claude Code plugin **and** as a standalone MCP server for other clients.

## Non-goals (YAGNI)

- No video/audio downloading.
- No separate Anthropic API key or server-side LLM calls.
- No Ollama / non-Claude model support (explicitly deferred).
- No map-reduce summarization of oversized transcripts in v1 (guard + guidance instead).
- No official YouTube Data API integration in v1 (keyless engine is the default;
  an optional API-key search path can be added later).

## Architecture

Three layers with clean boundaries:

1. **Core logic** (`src/youtube/*`, `src/library/*`) — knows nothing about MCP.
   Pure-ish modules for search, transcript fetch/format, path resolution,
   caching, and file saving. Independently testable.
2. **MCP tools** (`src/tools/*`) — thin wiring: a zod input schema plus a handler
   that delegates to the core logic and returns MCP results/errors.
3. **Plugin layer** (`commands/*.md`, `.claude-plugin/plugin.json`) —
   Claude Code slash commands and the plugin manifest. The summarization
   workflow lives here, not in the server.

### Why summarization lives in the host, not the server

The server is keyless by design. Summaries are produced by the host Claude using
your existing subscription. The `/yt-summary` command orchestrates the flow and
the server only **persists** the result (`youtube_save_summary`). This keeps the
server free of secrets and avoids a separate API bill, while still allowing the
right model to be chosen per job (see Summarization).

## Project layout

```
ytb-tools/
├── .claude-plugin/plugin.json   # plugin manifest (name, version, mcp ref)
├── .mcp.json                    # how Claude Code launches the server
├── package.json · tsconfig.json
├── commands/                    # Claude Code slash commands (markdown)
│   ├── yt-search.md
│   ├── yt-transcript.md
│   └── yt-summary.md
├── src/
│   ├── index.ts                 # MCP server bootstrap (stdio transport)
│   ├── config.ts                # env reading
│   ├── youtube/
│   │   ├── client.ts            # owns the youtubei.js "Innertube" singleton
│   │   ├── search.ts            # query → normalized results
│   │   └── transcript.ts        # videoId → segments + full text + languages
│   ├── library/
│   │   ├── paths.ts             # cross-platform output + cache dirs
│   │   ├── cache.ts             # transcript cache (read/write)
│   │   └── save.ts              # write transcript + summary files
│   └── tools/
│       ├── search.ts
│       ├── transcript.ts
│       └── saveSummary.ts
└── dist/                        # compiled JS the server runs
```

### Dependencies

- **Runtime:** `@modelcontextprotocol/sdk` (MCP server), `youtubei.js` (YouTube),
  `zod` (tool input validation), `env-paths` (OS cache dir).
- **Dev:** `typescript`, `tsx` or `tsup` (build), `vitest` (tests), `@types/node`.
- **Removed:** `@anthropic-ai/sdk` — not needed, since the server never calls an LLM.

## MCP tools

All tools return errors as proper MCP tool errors (`isError`), never uncaught
throws.

### 1. `youtube_search`
- **Input:** `query` (string, required), `limit` (int, default 10),
  `type` (`video` | `channel` | `playlist`, default `video`).
- **Output:** array of
  `{ videoId, title, channel, durationSeconds, viewCount, publishedAt, url, descriptionSnippet }`.
- Pure read; no saving.

### 2. `youtube_get_transcript`
- **Input:** `video` (URL **or** bare videoId, required), `lang` (BCP-47 like
  `en` / `tr`, optional), `fresh` (bool, default false — bypass cache).
- **Output:**
  `{ videoId, title, language, availableLanguages: [...], segments: [{ startSeconds, text }], fullText }`.
- **Language selection:** prefer the video's original track → English → first
  available; honor `lang` when given; always return `availableLanguages` so the
  caller can re-request.
- **Side effects:** writes the transcript cache, and (auto-save) writes
  `transcripts/{videoId}.{lang}.json` + `.txt` to the library.
- **Errors:** clear error when the video has no captions, is unavailable, or is
  region-blocked.

### 3. `youtube_save_summary`
- **Purpose:** persist a **host-generated** summary into the library. (Replaces
  the earlier API-calling `youtube_summarize` tool.)
- **Input:** `videoId` (string, required), `summary` (string, required),
  `style` (`quick` | `standard` | `detailed`), and metadata
  `{ title, url, model, language }`.
- **Output:** `{ savedTo }` (the file path written).
- **Side effects:** writes `summaries/{videoId}.{style}.md` with YAML frontmatter
  (`title, url, model, date, language, style`).

## Summarization

Summarization is performed by the **host Claude**, not the server. The model is
chosen per job ("style"):

| `style` | Model (Claude Code subagent) | Underlying model ID | Intent |
|---|---|---|---|
| `quick` | `haiku` | `claude-haiku-4-5` | Fast TL;DR + a few bullets |
| `standard` *(default)* | `sonnet` | `claude-sonnet-4-6` | Structured key points + takeaways |
| `detailed` | `opus` | `claude-opus-4-8` | Deep analysis: chapters, themes, quotes |

### Flow (`/yt-summary <url|id> [quick|standard|detailed]`)

In **Claude Code** (primary target):
1. The main session calls `youtube_get_transcript` (cache-aware).
2. It dispatches a **summarizer subagent** with the `model` mapped from the
   style (quick→haiku, standard→sonnet, detailed→opus), passing the transcript
   text and the requested depth. The subagent returns the summary text only;
   it does not need MCP access.
3. The main session calls `youtube_save_summary` to persist the result.

In **Claude Desktop / other MCP clients** (no subagents, no slash commands):
the user asks Claude to summarize the fetched transcript; the summary uses the
app's current model. `style` still changes summary depth, and
`youtube_save_summary` still persists it — but per-style **model** selection is a
Claude Code feature.

### Output language

Summaries default to the **transcript's language** (a Turkish video → a Turkish
summary). A per-call override is available through the command (and is just an
instruction in the summarization prompt).

### Oversized transcripts

Before summarizing, estimate transcript size against the chosen model's input
window. If it would exceed the window, escalate to a larger-context model
(Sonnet/Opus, ~1M tokens) or return clear guidance — never silently truncate.
(Map-reduce chunking is a future extension, not in v1.)

## Persistence & cross-platform paths

Two on-disk locations, both resolved at runtime — **never a hardcoded `~`**.

### Library (auto-saved transcripts + summaries)
- Default: `path.join(os.homedir(), "ytb-tools")`, correct on every OS:
  - macOS → `/Users/you/ytb-tools`
  - Linux → `/home/you/ytb-tools`
  - Windows → `C:\Users\you\ytb-tools`
- Override: `YT_OUTPUT_DIR` (a leading `~` in the value is expanded by us, since
  Node won't).
- Subfolders: `transcripts/` and `summaries/`.
- Formats: transcripts as `.json` (segments) + `.txt` (plain); summaries as
  `.md` with YAML frontmatter.
- **Save policy:** auto-save everything — every transcript fetched and every
  summary generated is written automatically.

### Internal transcript cache
- Kept out of the browsable library, in each OS's conventional cache dir via
  `env-paths`:
  - macOS → `~/Library/Caches/ytb-tools`
  - Linux → `~/.cache/ytb-tools` (honors `XDG_CACHE_HOME`)
  - Windows → `%LOCALAPPDATA%\ytb-tools\Cache`
- Override: `YT_CACHE_DIR`.
- Keyed by `videoId + lang`; bypassed with the `fresh` flag.
- The cache exists to avoid re-fetching and to make repeat summaries cheaper.

Directories are created on first use if missing.

## Slash commands (Claude Code)

Thin Markdown prompts that drive the MCP tools:
- `/yt-search <query>` → `youtube_search`, prints a clean ranked list.
- `/yt-transcript <url|id> [lang]` → `youtube_get_transcript`.
- `/yt-summary <url|id> [quick|standard|detailed]` → the summarization flow above.

## Configuration (env)

No API key. Only:
- `YT_OUTPUT_DIR` — library location (default `os.homedir()/ytb-tools`).
- `YT_CACHE_DIR` — cache location (default OS cache dir via `env-paths`).
- `YT_MODEL_{QUICK,STANDARD,DETAILED}` — optional overrides of the style→model
  mapping used by `/yt-summary`.

## Compatibility / installation per client

- **Claude Code:** install as a plugin → gets the three tools **and** the
  `/yt-*` slash commands (including subagent-based model selection).
- **Claude Desktop:** add the server to `claude_desktop_config.json` pointing at
  `node /abs/path/to/dist/index.js` (with any `YT_*` env vars) → gets the three
  tools. No slash commands; summarize by asking in natural language with the
  app's current model.
- **Cursor / Cline / other MCP clients:** register the same server command in
  that client's MCP config.

The plugin manifest (`.claude-plugin/plugin.json`) and `.mcp.json` launch the
server via `node ${CLAUDE_PLUGIN_ROOT}/dist/index.js`. Exact manifest schema is
verified during implementation.

## Error handling

Surfaced as clear MCP tool errors:
- No captions available for the video.
- Video unavailable / private / region-blocked / age-restricted.
- Transcript too large for the requested model (with guidance to escalate).
- `youtubei.js` breakage (wrap and suggest updating the package).

## Testing

- **Unit (`vitest`):** result normalization, transcript formatting, language
  selection, cross-platform path resolution, cache read/write, summary file
  writing (frontmatter + slug). `youtubei.js` is mocked.
- **Integration (network-gated, skipped in CI):** a couple of live calls against
  a known stable video for search + transcript.

## Open implementation details (resolved during build, not blocking)

- Exact `.claude-plugin/plugin.json` and `.mcp.json` schema/fields.
- Precise `youtubei.js` calls for search and `getTranscript` and their response
  shapes.
- Subagent dispatch wording in `/yt-summary` (which `subagent_type`, prompt).
