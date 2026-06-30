import { z } from "zod";
import { searchVideos } from "../youtube/search.js";

export const searchInput = {
  query: z.string().min(1).describe("Search query"),
  limit: z.number().int().min(1).max(50).default(10).describe("Maximum results"),
  type: z.enum(["video", "channel", "playlist"]).default("video").describe("Result type"),
};

export async function handleSearch(args: {
  query: string;
  limit?: number;
  type?: "video" | "channel" | "playlist";
}) {
  const results = await searchVideos(args.query, { limit: args.limit, type: args.type });
  return { count: results.length, results };
}
