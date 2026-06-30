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

No API keys are required anywhere. **Search** uses the keyless `youtubei.js`
library. **Transcripts** use **yt-dlp**, which the server auto-provisions — it
prefers a system `yt-dlp` (or `YT_DLP_PATH`) and otherwise downloads the official
standalone binary into its cache on first use; no manual install, no Python, no
Deno (it reuses the Node that runs the server as yt-dlp's JS runtime).
**Summarization** is done by the host Claude.

> **Why yt-dlp for transcripts (verified 2026-06):** as of mid-2026, YouTube's
> PO-token / `exp=xpe` clampdown makes keyless transcript fetching infeasible —
> `youtubei.js`'s `get_transcript` returns HTTP 400, and caption `timedtext`
> URLs return empty 200 bodies even with a generated PO token (confirmed via
> spike) or inside a headless browser. yt-dlp is the only path that reliably
> extracts arbitrary transcripts, so the server automates its provisioning to
> keep the "user installs nothing" promise.

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
│   │   └── transcript.ts        # videoId → segments (via yt-dlp json3)
│   ├── ytdlp/
│   │   └── provision.ts         # locate/auto-download the yt-dlp binary
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

- **Runtime:** `@modelcontextprotocol/sdk` (MCP server), `youtubei.js` (search),
  `zod` (tool input validation), `env-paths` (OS cache dir).
- **Dev:** `typescript`, `tsx` or `tsup` (build), `vitest` (tests), `@types/node`.
- **yt-dlp:** provisioned at runtime, **not** an npm dependency — `provision.ts`
  downloads the official standalone binary with Node's built-in `fetch` and
  verifies it with `crypto`, then runs it via `child_process`. No package needed.
- **Removed:** `@anthropic-ai/sdk` — the server never calls an LLM.

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
- **Engine:** yt-dlp. Runs `yt-dlp -J` to discover the title + available caption
  languages, then downloads the chosen track as `json3` and parses it. The first
  call may trigger a one-time, ~36 MB binary download into the cache (only if no
  system `yt-dlp`/`YT_DLP_PATH` is available); later calls reuse it.
- **Input:** `video` (URL **or** bare videoId, required), `lang` (BCP-47 like
  `en` / `tr`, optional), `fresh` (bool, default false — bypass cache).
- **Output:**
  `{ videoId, title, language, availableLanguages: [...], segments: [{ startSeconds, text }], fullText }`.
- **Language selection:** prefer `lang` when given → the video's reported
  language → English → first available; always return `availableLanguages` so the
  caller can re-request.
- **Side effects:** writes the transcript cache, and (auto-save) writes
  `transcripts/{videoId}.{lang}.json` + `.txt` to the library.
- **Errors:** clear error when the video has no captions, is unavailable/region-
  blocked, or when yt-dlp can't be provisioned (with install guidance).

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

### Auto-provisioned yt-dlp binary
- Stored under the cache dir, in a `bin/` subfolder (e.g. `~/.cache/ytb-tools/bin/`).
- Downloaded once from the official `yt-dlp/yt-dlp` GitHub releases, matched to
  `process.platform`/`process.arch`; SHA-256 verified against the release's
  `SHA2-256SUMS` when reachable; `chmod 0o755` on POSIX.
- Skipped entirely if `YT_DLP_PATH` is set or a `yt-dlp` is found on `PATH`.
- Invoked with `--js-runtimes node:<process.execPath>` so it reuses the server's
  Node and needs no Python/Deno.

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
- `YT_DLP_PATH` — path to an existing yt-dlp binary (skips auto-download).
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
- yt-dlp cannot be provisioned (download failed and no system binary) — with the
  per-OS manual install commands as guidance.
- `youtubei.js` search breakage (wrap and suggest updating the package).

## Testing

- **Unit (`vitest`):** search result normalization, json3 transcript parsing,
  language selection, yt-dlp release asset mapping, cross-platform path
  resolution, cache read/write, summary file writing (frontmatter + slug).
  `youtubei.js` and the yt-dlp subprocess are mocked.
- **Integration (network-gated, skipped in CI):** a couple of live calls against
  a known stable video for search and for transcript (the transcript live test
  exercises the real auto-download + extraction path).

## Open implementation details (resolved during build, not blocking)

- Exact `.claude-plugin/plugin.json` and `.mcp.json` schema/fields.
- Precise `youtubei.js` search call response shapes (validated live during build).
- Subagent dispatch wording in `/yt-summary` (which `subagent_type`, prompt).
