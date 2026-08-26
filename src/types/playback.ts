export type TranslationType = "sub" | "dub";

export type CatalogProvider = "anikoto" | "anikoto2";

export interface SearchResult {
  id: string;
  name: string;
  episodes: number;
  provider: CatalogProvider;
}

export interface SubtitleTrack {
  label: string;
  url: string;
  default: boolean;
}

export interface RequestHeaders {
  referer: string | null;
  origin: string | null;
  extra: Record<string, string>;
}

export interface StreamLink {
  url: string;
  resolution: string;
  hls: boolean;
  provider: string;
  downloadable: boolean;
  headers: RequestHeaders;
  subtitles: SubtitleTrack[];
}