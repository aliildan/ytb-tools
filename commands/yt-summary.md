---
description: Summarize a YouTube video at a chosen depth using the right model.
argument-hint: <url|id> [quick|standard|detailed]
---

Summarize the YouTube video given by: $ARGUMENTS

The first token is the video URL or ID. The optional second token is the style:
`quick`, `standard` (default), or `detailed`.

Do this:
1. Call the `youtube_get_transcript` MCP tool with the video. Note its
   `videoId`, `title`, and `language`.
2. Map the style to a model:
   - `quick` → subagent model `haiku` (id `claude-haiku-4-5`)
   - `standard` → subagent model `sonnet` (id `claude-sonnet-4-6`)
   - `detailed` → subagent model `opus` (id `claude-opus-4-8`)
3. Dispatch a subagent (Task tool) with that model. Pass it the transcript's
   `fullText` and instruct it to write the summary **in the transcript's
   language**, at this depth:
   - `quick`: a one-line TL;DR plus 3–5 bullets.
   - `standard`: structured key points and takeaways.
   - `detailed`: chapters/sections, themes, and notable quotes.
   The subagent returns only the summary text.
4. Call the `youtube_save_summary` MCP tool with `videoId`, the summary text,
   the `style`, the `title`, the video `url`, the model `id` from step 2, and
   the `language`.
5. Show the summary and the saved file path to the user.

(In MCP clients without subagents, such as Claude Desktop, summarize with the
current model instead; `style` then changes only the depth.)
