import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { useLocation } from "react-router-dom";
import Hls from "hls.js";

import PageHeader from "../../components/layout/PageHeader";

import {
  getPlaybackEpisodes,
  getPlaybackStreams,
  playbackPrepareStream,
  playbackStop,
  searchPlayback,
} from "../../api/playback";

import type {
  SearchResult,
  StreamLink,
  TranslationType,
} from "../../types/playback";

export default function Playback() {
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState<TranslationType>("sub");

  const [results, setResults] = useState<SearchResult[]>([]);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [streams, setStreams] = useState<StreamLink[]>([]);

  const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [selectedStream, setSelectedStream] = useState<StreamLink | null>(null);

  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialQuery =
    typeof location.state === "object" &&
    location.state !== null &&
    "query" in location.state
      ? String(location.state.query)
      : "";

  useEffect(() => {
    if (!initialQuery) {
      return;
    }

    setQuery(initialQuery);
    void handleSearch(initialQuery, translation);
  }, [initialQuery, translation]);

  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      void playbackStop();
    };
  }, []);

  useEffect(() => {
    if (!selectedStream) return;

    function handlePlayerKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, button, [role='button']"))
      ) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case "ArrowRight":
          event.preventDefault();
          video.currentTime = Math.min(
            Number.isFinite(video.duration) ? video.duration : Infinity,
            video.currentTime + 5,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          video.muted = false;
          video.volume = Math.min(1, video.volume + 0.05);
          break;
        case "ArrowDown":
          event.preventDefault();
          video.volume = Math.max(0, video.volume - 0.05);
          break;
        case " ":
          event.preventDefault();
          if (video.paused) {
            void video.play().catch((error: unknown) => setError(String(error)));
          } else {
            video.pause();
          }
          break;
      }
    }

    window.addEventListener("keydown", handlePlayerKeyDown);
    return () => window.removeEventListener("keydown", handlePlayerKeyDown);
  }, [selectedStream]);

  async function handleSearch(nextQuery = query, nextTranslation = translation) {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery) return;

    setLoading(true);
    setError(null);

    try {
      const result = await searchPlayback(trimmedQuery, nextTranslation);

      setResults(result);
      setSelectedShow(null);
      setEpisodes([]);
      setStreams([]);
      setSelectedStream(null);
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectShow(show: SearchResult) {
    setSelectedShow(show);
    setEpisodes([]);
    setStreams([]);
    setSelectedStream(null);
    setError(null);

    setLoading(true);

    try {
      const result = await getPlaybackEpisodes(show.id, translation);

      setEpisodes(result);

      if (result.length > 0) {
        setSelectedEpisode(result[0]);
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadStreams() {
    if (!selectedShow || !selectedEpisode) return;

    setLoading(true);
    setError(null);
    setStreams([]);
    setSelectedStream(null);

    try {
      const result = await getPlaybackStreams(
        selectedShow.id,
        selectedEpisode,
        translation,
      );

      setStreams(result);

      if (result[0]) {
        await handlePlay(result[0]);
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function handlePlay(stream: StreamLink) {
    const video = videoRef.current;

    if (!video) {
      setError("Video element is not available.");
      return;
    }

    setError(null);
    setSelectedStream(stream);
    setPlaying(false);

    hlsRef.current?.destroy();
    hlsRef.current = null;

    try {
      const url = await playbackPrepareStream(stream);

      if (stream.hls) {
        if (!Hls.isSupported()) {
          throw new Error("HLS is not supported by this WebView.");
        }

        const hls = new Hls();

        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play();
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;

            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;

            default:
              hls.destroy();
              hlsRef.current = null;
              setError(`Fatal HLS error: ${data.details}`);
          }
        });
      } else {
        video.src = url;
        await video.play();
      }
    } catch (error) {
      setError(String(error));
    }
  }

  function handleVideoPlay() {
    setPlaying(true);
  }

  function handleVideoPause() {
    setPlaying(false);
  }

  return (
    <main className="playback">
      <PageHeader
        icon={<Play size={20} />}
        title="Playback"
        subtitle="Search for an anime, select an episode, and start watching."
        meta={selectedShow ? "Ready" : "Idle"}
        actions={
          <div className="playback__session">
            <span className="playback__session-badge">Session</span>
            <span className="playback__session-copy">
              Playback stops when you leave this page.
            </span>
          </div>
        }
      />

      {error && (
        <section className="playback__error">
          <div className="playback__error-icon">!</div>

          <div>
            <strong>Playback error</strong>
            <span>{error}</span>
          </div>
        </section>
      )}

      <div className="playback__content">
        <aside className="playback__panel playback__panel--sidebar">
          <div className="playback__toolbar">
            <div className="playback__search-input">
              <span aria-hidden="true">⌕</span>

              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSearch();
                  }
                }}
                placeholder="Search anime..."
              />
            </div>

            <select
              value={translation}
              onChange={(event) =>
                setTranslation(event.target.value as TranslationType)
              }
            >
              <option value="sub">Sub</option>
              <option value="dub">Dub</option>
            </select>

            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={loading || !query.trim()}
            >
              {loading ? "Searching…" : "Search"}
            </button>
          </div>

          {selectedShow && (
            <section className="playback__episode-picker">
              <div className="playback__episode-info">
                <span className="playback__label">SELECT EPISODE</span>
                <h2>{selectedShow.name}</h2>
                <p>Choose an episode to find available streams.</p>
              </div>

              <div className="playback__episode-controls">
                <select
                  value={selectedEpisode}
                  onChange={(event) => setSelectedEpisode(event.target.value)}
                >
                  {episodes.map((episode) => (
                    <option key={episode} value={episode}>
                      Episode {episode}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void handleLoadStreams()}
                  disabled={loading || !selectedEpisode}
                >
                  {loading ? "Loading…" : "Find streams"}
                </button>
              </div>
            </section>
          )}

          {results.length > 0 && (
            <section className="playback__section">
              <div className="playback__section-header">
                <div>
                  <span className="playback__label">SEARCH RESULTS</span>
                  <h2>Choose an anime</h2>
                </div>

                <span className="playback__section-count">{results.length}</span>
              </div>

              <div className="playback__results">
                {results.map((show) => (
                  <button
                    key={show.id}
                    type="button"
                    className={
                      selectedShow?.id === show.id
                        ? "playback__result playback__result--active"
                        : "playback__result"
                    }
                    onClick={() => void handleSelectShow(show)}
                  >
                    <div className="playback__result-main">
                      <strong>{show.name}</strong>
                      <span>{show.provider}</span>
                    </div>

                    {show.episodes > 0 && (
                      <span className="playback__result-count">{show.episodes}</span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {streams.length > 0 && (
            <section className="playback__section">
              <div className="playback__section-header">
                <div>
                  <span className="playback__label">AVAILABLE SOURCES</span>
                  <h2>Choose a stream</h2>
                </div>

                <span className="playback__section-count">{streams.length}</span>
              </div>

              <div className="playback__streams">
                {streams.map((stream, index) => (
                  <button
                    key={`${stream.url}-${index}`}
                    type="button"
                    className={
                      selectedStream?.url === stream.url
                        ? "playback__stream playback__stream--active"
                        : "playback__stream"
                    }
                    onClick={() => void handlePlay(stream)}
                  >
                    <div className="playback__stream-quality">
                      <strong>{stream.resolution}</strong>
                      <span>{stream.provider}</span>
                    </div>

                    <div className="playback__stream-meta">
                      <span>{stream.hls ? "HLS" : "Direct"}</span>

                      {stream.subtitles.length > 0 && (
                        <span>CC {stream.subtitles.length}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading && !results.length && !selectedShow && !streams.length && (
            <div className="playback__empty-state">
              <div className="playback__empty-state-icon">⌕</div>
              <strong>Search for a title</strong>
              <span>Find an anime to load episodes and source options.</span>
            </div>
          )}
        </aside>

        <section className="playback__panel playback__panel--player">
          <div className="playback__player-header">
            <div className="playback__now-playing">
              <span className="playback__label">NOW PLAYING</span>
              <strong>{selectedShow?.name ?? "Nothing playing"}</strong>

              {selectedEpisode && (
                <span className="playback__now-playing-episode">
                  Episode {selectedEpisode}
                </span>
              )}
            </div>

            {selectedStream && (
              <div className="playback__player-badges">
                <span>{selectedStream.resolution}</span>
                <span>{selectedStream.provider}</span>
                <span>{selectedStream.hls ? "HLS" : "Direct"}</span>
                {playing && <span className="playback__player-status">Playing</span>}
              </div>
            )}
          </div>

          <div className="playback__video">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
            />

            {!selectedStream && (
              <div className="playback__video-placeholder">
                <div className="playback__video-placeholder-icon">▶</div>
                <strong>Nothing playing</strong>
                <span>
                  Search for an anime and select a stream to start playback.
                </span>
              </div>
            )}
          </div>

          {selectedStream && (
            <p className="playback__keyboard-hint">
              Keyboard: ←/→ seek 5 seconds · ↑/↓ adjust volume · Space play/pause
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
