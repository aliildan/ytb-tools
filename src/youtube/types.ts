export interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
  url: string;
  descriptionSnippet: string;
}

export interface TranscriptSegment {
  startSeconds: number;
  text: string;
}

export interface Transcript {
  videoId: string;
  title: string;
  language: string;
  availableLanguages: string[];
  segments: TranscriptSegment[];
  fullText: string;
}
