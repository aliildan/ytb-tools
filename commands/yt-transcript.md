---
description: Fetch and display a YouTube transcript.
argument-hint: <url|id> [lang]
---

Fetch the transcript for: $ARGUMENTS

The first token is the video URL or ID; an optional second token is a BCP-47
language code (e.g. `tr`). Call the `youtube_get_transcript` MCP tool. (On the
very first use it may download the yt-dlp helper once — this is expected.) Report
the detected language and the available languages, then show the transcript.
