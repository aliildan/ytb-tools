---
name: yt-research
description: Research a YouTube topic end to end — search for N videos on a keyword, pull each transcript, summarize each, and produce one combined digest. Use when the user wants to batch-process, survey, or research many videos on a topic at once (e.g. "research the top 30 videos on X", "summarize 150 videos about Y").
---

# YouTube topic research (search → transcripts → summaries → digest)

This skill runs the full pipeline over many videos using the ytb-tools MCP tools
(`youtube_search`, `youtube_get_transcript`, `youtube_save_summary`).

## Inputs (parse from the user's request)

- **keyword** (required) — the search query.
- **count** (default 10) — how many videos to process (the "N").
- **depth** (default `quick`) — `quick` | `standard` | `detailed`.
- **language** (optional) — override the summary language (default = each video's language).

## Steps

### 1. Search
Call `youtube_search` with `query = keyword` and `limit = count`. Report how many
results actually came back (it may be fewer than requested — YouTube limits search
depth).

### 2. Confirm before large runs
If the result count is **greater than 20**, STOP and confirm with the user before
continuing — tell them exactly how many videos will be fetched and summarized and
that it will take time and tokens. Wait for a yes. Skip this confirmation only if
the user already explicitly approved a large run in their request (e.g. "yes,
summarize all 150").

### 3. Fetch + summarize in batches
Process the videos in **batches of 10**. For each batch:

1. For each video, call `youtube_get_transcript` with the videoId.
   - If a video has **no transcript** (error), skip it and record it in a
     "skipped" list — do **not** abort the whole run.
2. Summarize each fetched transcript at the chosen **depth**, in the transcript's
   language (or the `language` override). Pick the model by depth and dispatch a
   **subagent** (Task tool) per summary — run the batch's summaries in parallel:
   - `quick` → model `haiku` (`claude-haiku-4-5`): one-line TL;DR + 3–5 bullets.
   - `standard` → model `sonnet` (`claude-sonnet-4-6`): key points + takeaways.
   - `detailed` → model `opus` (`claude-opus-4-8`): chapters, themes, quotes.
   Each subagent receives the transcript `fullText` and returns only the summary.
3. For each summary, call `youtube_save_summary` with `videoId`, the summary text,
   the `style` (= depth), `title`, video `url`, the model id, and `language`.
4. After each batch, post a short progress line: `Batch k/N done — M summarized, S skipped`.

### 4. Combined digest
After all batches, synthesize **one digest** across every summary:

- A 2–4 sentence overview of what the corpus covers.
- The main **themes/patterns** that recur across videos.
- A ranked **"start here" shortlist** (5–10 videos) with a one-line reason each.
- The list of **skipped** videos (no transcript), if any.

Save the digest by calling `youtube_save_summary` with:
- `videoId` = `digest-<keyword-slug>` (lowercase, dashes),
- `summary` = the digest text,
- `style` = `digest`,
- `title` = `Digest: <keyword>`,
- `url` = "",
- `model` = the model you used to write the digest,
- `language` = the digest's language.

Then present the digest to the user, and tell them where the per-video summaries
and the digest were saved (the library, default `~/ytb-tools/summaries/`).

## Guardrails

- **Default depth is `quick`** to keep large batches cheap. Only use `standard`/
  `detailed` if the user asks.
- Never silently truncate or skip work — report counts (found / summarized /
  skipped) honestly.
- If many videos in a row fail to fetch (e.g. a rate-limit wall), pause and tell
  the user rather than hammering on.
