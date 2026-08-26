import { invoke } from "@tauri-apps/api/core";

import type {
  SearchResult,
  StreamLink,
  TranslationType,
} from "../types/playback";

export function searchPlayback(
  query: string,
  translation: TranslationType,
): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("playback_search", {
    query,
    translation,
  });
}

export function getPlaybackEpisodes(
  showId: string,
  translation: TranslationType,
): Promise<string[]> {
  return invoke<string[]>("playback_episodes", {
    showId,
    translation,
  });
}

export function getPlaybackStreams(
  showId: string,
  episode: string,
  translation: TranslationType,
): Promise<StreamLink[]> {
  return invoke<StreamLink[]>("playback_streams", {
    showId,
    episode,
    translation,
  });
}

export function playbackPrepareStream(
  stream: StreamLink,
): Promise<string> {
  return invoke<string>("playback_prepare_stream", {
    stream,
  });
}

export function playbackStop(): Promise<void> {
  return invoke("playback_stop");
}