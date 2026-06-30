import { z } from "zod";
import { saveSummary } from "../library/save.js";

export const saveSummaryInput = {
  videoId: z.string().min(1).describe("11-character video ID"),
  summary: z.string().min(1).describe("The summary text produced by the host model"),
  style: z.enum(["quick", "standard", "detailed"]).default("standard"),
  title: z.string().default("").describe("Video title"),
  url: z.string().default("").describe("Video URL"),
  model: z.string().default("").describe("Model that produced the summary"),
  language: z.string().default("").describe("Summary language (BCP-47)"),
};

export async function handleSaveSummary(
  args: {
    videoId: string;
    summary: string;
    style?: "quick" | "standard" | "detailed";
    title?: string;
    url?: string;
    model?: string;
    language?: string;
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ savedTo: string }> {
  const savedTo = await saveSummary(
    args.videoId,
    args.summary,
    {
      title: args.title ?? "",
      url: args.url ?? "",
      model: args.model ?? "",
      language: args.language ?? "",
      style: args.style ?? "standard",
    },
    env,
  );
  return { savedTo };
}
