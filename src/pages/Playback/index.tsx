import {useEffect, useRef, useState} from "react";
import {ArrowLeft, ChevronLeft, ChevronRight, Play} from "lucide-react";
import {useLocation} from "react-router-dom";
import Hls from "hls.js";

import PageHeader from "../../components/layout/PageHeader";
import {useUpdateEntry} from "../../hooks/useAniList";

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
    const requestIdRef = useRef(0);
    const playbackCommandRef = useRef<Promise<void>>(Promise.resolve());
    const {updateEntry} = useUpdateEntry();

    const [query, setQuery] = useState("");
    const [translation, setTranslation] = useState<TranslationType>("sub");

    const [results, setResults] = useState<SearchResult[]>([]);
    const [episodes, setEpisodes] = useState<string[]>([]);
    const [streams, setStreams] = useState<StreamLink[]>([]);

    const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
    const [selectedEpisode, setSelectedEpisode] = useState("");
    const [selectedStream, setSelectedStream] = useState<StreamLink | null>(null);
    const completionSyncRef = useRef<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const initialQuery =
        typeof location.state === "object" &&
        location.state !== null &&
        "query" in location.state
            ? String(location.state.query)
            : "";

    const linkedMediaId =
        typeof location.state === "object" &&
        location.state !== null &&
        "mediaId" in location.state
            ? Number(location.state.mediaId)
            : null;

    const linkedMediaType =
        typeof location.state === "object" &&
        location.state !== null &&
        "mediaType" in location.state
            ? String(location.state.mediaType)
            : null;

    const hasAniListLink =
        Number.isFinite(linkedMediaId) && linkedMediaId !== null && linkedMediaId > 0;

    function queuePlaybackCommand<T>(command: () => Promise<T>): Promise<T> {
        const commandPromise = playbackCommandRef.current.then(command);
        playbackCommandRef.current = commandPromise.then(
            () => undefined,
            () => undefined,
        );
        return commandPromise;
    }

    function stopCurrentPlayback(): Promise<void> {
        const video = videoRef.current;
        video?.pause();
        video?.removeAttribute("src");
        video?.load();
        hlsRef.current?.destroy();
        hlsRef.current = null;
        setPlaying(false);
        return queuePlaybackCommand(playbackStop);
    }

    useEffect(() => {
        if (!initialQuery) {
            return;
        }

        setQuery(initialQuery);
        void handleSearch(initialQuery, translation);
    }, [initialQuery, translation]);

    useEffect(() => {
        return () => {
            requestIdRef.current += 1;
            hlsRef.current?.destroy();
            void queuePlaybackCommand(playbackStop).catch((reason: unknown) => {
                console.error("Failed to stop playback", reason);
            });
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
                case "f":
                case "F":
                    event.preventDefault();
                    if (document.fullscreenElement) {
                        void document.exitFullscreen().catch((error: unknown) => setError(String(error)));
                    } else {
                        void video.requestFullscreen().catch((error: unknown) => setError(String(error)));
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

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);

        try {
            await stopCurrentPlayback();
            if (requestId !== requestIdRef.current) return;

            const result = await searchPlayback(trimmedQuery, nextTranslation);
            if (requestId !== requestIdRef.current) return;

            setResults(result);
            setSelectedShow(null);
            setEpisodes([]);
            setStreams([]);
            setSelectedStream(null);
        } catch (error) {
            if (requestId === requestIdRef.current) setError(String(error));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }

    async function handleSelectShow(show: SearchResult) {
        const requestId = ++requestIdRef.current;
        completionSyncRef.current = null;
        setSelectedShow(show);
        setSelectedEpisode("");
        setEpisodes([]);
        setStreams([]);
        setSelectedStream(null);
        setError(null);

        setLoading(true);

        try {
            await stopCurrentPlayback();
            if (requestId !== requestIdRef.current) return;

            const result = await getPlaybackEpisodes(show.id, translation);
            if (requestId !== requestIdRef.current) return;
            setEpisodes(result);
        } catch (error) {
            if (requestId === requestIdRef.current) setError(String(error));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }

    function handleBackToResults() {
        requestIdRef.current += 1;
        void stopCurrentPlayback().catch((reason: unknown) => setError(String(reason)));
        setSelectedShow(null);
        setSelectedEpisode("");
        setEpisodes([]);
        setStreams([]);
        setSelectedStream(null);
        setPlaying(false);
        setLoading(false);
        setError(null);
    }

    async function syncEpisodeProgress(nextEpisode: string | number) {
        if (!hasAniListLink || linkedMediaId === null) return;

        const numericEpisode = Number(nextEpisode);
        if (!Number.isFinite(numericEpisode) || numericEpisode <= 0) return;

        try {
            await updateEntry({
                mediaId: linkedMediaId,
                status: "CURRENT",
                progress: numericEpisode,
            });
        } catch (reason) {
            console.error("AniList progress sync failed", reason);
        }
    }

    async function handleLoadStreams(episode = selectedEpisode) {
        if (!selectedShow || !episode) return;

        const requestId = ++requestIdRef.current;
        setLoading(true);
        setError(null);
        setStreams([]);
        setSelectedStream(null);
        setSelectedEpisode(episode);

        try {
            await stopCurrentPlayback();
            if (requestId !== requestIdRef.current) return;

            const result = await getPlaybackStreams(
                selectedShow.id,
                episode,
                translation,
            );
            if (requestId !== requestIdRef.current) return;

            setStreams(result);

            if (result[0]) {
                await handlePlay(result[0], requestId);
            }
        } catch (error) {
            if (requestId === requestIdRef.current) setError(String(error));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }

    function handleSelectEpisode(episode: string) {
        void handleLoadStreams(episode);
    }

    function handleAdjacentEpisode(direction: -1 | 1) {
        const currentIndex = episodes.indexOf(selectedEpisode);
        const nextEpisode = episodes[currentIndex + direction];
        if (nextEpisode) handleSelectEpisode(nextEpisode);
    }

    async function handlePlay(stream: StreamLink, requestId = ++requestIdRef.current) {
        const video = videoRef.current;

        if (!video) {
            setError("Video element is not available.");
            return;
        }

        completionSyncRef.current = null;
        setError(null);
        setLoading(true);
        setSelectedStream(stream);
        setPlaying(false);

        hlsRef.current?.destroy();
        hlsRef.current = null;
        video.pause();
        video.removeAttribute("src");
        video.load();

        try {
            if (stream.hls && !Hls.isSupported()) {
                setError("HLS is not supported by this WebView.");
                return;
            }

            const url = await queuePlaybackCommand(async () => {
                if (requestId !== requestIdRef.current) return null;
                return playbackPrepareStream(stream);
            });
            if (!url || requestId !== requestIdRef.current) return;

            if (stream.hls) {
                const hls = new Hls();

                hlsRef.current = hls;

                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    if (requestId !== requestIdRef.current || hlsRef.current !== hls) return;
                    void video.play().catch((reason: unknown) => {
                        if (requestId === requestIdRef.current) setError(String(reason));
                    });
                });

                hls.on(Hls.Events.ERROR, (_, data) => {
                    if (!data.fatal || requestId !== requestIdRef.current) return;

                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;

                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;

                        default:
                            hls.destroy();
                            if (hlsRef.current === hls) hlsRef.current = null;
                            setError(`Fatal HLS error: ${data.details}`);
                    }
                });
            } else {
                video.src = url;
                await video.play();
            }
        } catch (error) {
            if (requestId === requestIdRef.current) setError(String(error));
        } finally {
            if (requestId === requestIdRef.current) setLoading(false);
        }
    }

    function handleVideoPlay() {
        setPlaying(true);
    }

    function handleVideoPause() {
        setPlaying(false);
    }

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !selectedEpisode || !selectedStream) return;

        const handleTimeUpdate = () => {
            const duration = Number(video.duration);
            const currentTime = Number(video.currentTime);
            const progress = duration > 0 ? currentTime / duration : 0;

            if (progress >= 0.75 && completionSyncRef.current !== selectedEpisode) {
                completionSyncRef.current = selectedEpisode;
                void syncEpisodeProgress(selectedEpisode);
            }
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        return () => video.removeEventListener("timeupdate", handleTimeUpdate);
    }, [selectedEpisode, selectedStream]);

    const selectedEpisodeIndex = episodes.indexOf(selectedEpisode);
    const pageStatus = loading
        ? selectedShow
            ? selectedEpisode
                ? "Loading stream"
                : "Loading episodes"
            : "Searching"
        : error
            ? "Playback error"
            : playing
                ? "Now playing"
                : selectedStream
                    ? "Paused"
                    : selectedShow
                        ? selectedEpisode
                            ? "No streams"
                            : episodes.length
                                ? "Choose episode"
                                : "No episodes"
                        : results.length
                            ? "Choose anime"
                            : "Idle";

    return (
        <main className="playback">
            <PageHeader
                icon={<Play size={20}/>}
                title={selectedShow?.name ?? "Playback"}
                subtitle={
                    selectedEpisode
                        ? `Episode ${selectedEpisode} · ${translation === "sub" ? "Sub" : "Dub"}`
                        : selectedShow
                            ? "Choose an episode to start watching."
                            : "Search for an anime, select an episode, and start watching."
                }
                meta={pageStatus}
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
                    {!selectedShow && (
                        <div className="playback__toolbar">
                            <div className="playback__search-input">
                                <span aria-hidden="true">⌕</span>

                                <input
                                    type="text"
                                    aria-label="Search anime"
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
                                aria-label="Audio translation"
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
                                className="button-primary"
                                onClick={() => void handleSearch()}
                                disabled={loading || !query.trim()}
                            >
                                {loading ? "Searching…" : "Search"}
                            </button>
                        </div>
                    )}

                    {selectedShow && (
                        <section className="playback__episode-picker">
                            <div className="playback__episode-info">
                                <div className="playback__episode-summary">
                                    <button
                                        type="button"
                                        className="playback__back-icon"
                                        onClick={handleBackToResults}
                                        aria-label="Back to results"
                                        title="Back to results"
                                    >
                                        <ArrowLeft size={16}/>
                                    </button>
                                    <span>
                                        {episodes.length
                                            ? `${episodes.length} episodes · ${translation === "sub" ? "Sub" : "Dub"}`
                                            : loading
                                                ? "Loading episodes…"
                                                : "No episodes found."}
                                    </span>
                                </div>
                            </div>

                            <div className="playback__episode-list">
                                {episodes.map((episode) => (
                                    <button
                                        key={episode}
                                        type="button"
                                        aria-pressed={selectedEpisode === episode}
                                        className={
                                            selectedEpisode === episode
                                                ? "playback__episode-option playback__episode-option--active"
                                                : "playback__episode-option"
                                        }
                                        onClick={() => handleSelectEpisode(episode)}
                                        disabled={loading}
                                    >
                                        <span>Episode {episode}</span>
                                        {selectedEpisode === episode && (
                                            <span className="playback__episode-current">
                                                {loading
                                                    ? "Loading…"
                                                    : selectedStream
                                                        ? "Now playing"
                                                        : "Selected"}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {selectedShow && selectedStream && (
                        <section className="playback__player-details">
                            <span>←/→ seek · ↑/↓ volume · Space play/pause · F fullscreen</span>
                            <span className="playback__sync-status">
                                {hasAniListLink && linkedMediaId
                                    ? `AniList sync active for this ${linkedMediaType ?? "title"} · updates at 75% watched or on completion`
                                    : "AniList sync unavailable for manual search"}
                            </span>
                        </section>
                    )}

                    {!selectedShow && results.length > 0 && (
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
                                        className="playback__result"
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

                    {!loading && !results.length && !selectedShow && !streams.length && (
                        <div className="playback__empty-state">
                            <div className="playback__empty-state-icon">⌕</div>
                            <strong>{query.trim() ? "No anime found" : "Search for a title"}</strong>
                            <span>
                                {query.trim()
                                    ? "Try another title or check the spelling."
                                    : "Find an anime to load episodes and source options."}
                            </span>
                        </div>
                    )}
                </aside>

                <section className="playback__panel--player">
                    <div className="playback__video">
                        <video
                            ref={videoRef}
                            aria-label="Video player"
                            controls
                            playsInline
                            preload="metadata"
                            onPlay={handleVideoPlay}
                            onPause={handleVideoPause}
                            onEnded={() => {
                                if (selectedEpisode && completionSyncRef.current !== selectedEpisode) {
                                    completionSyncRef.current = selectedEpisode;
                                    void syncEpisodeProgress(selectedEpisode);
                                }
                            }}
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

                    {selectedShow && episodes.length > 0 && (
                        <div className="playback__episode-navigation">
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => handleAdjacentEpisode(-1)}
                                disabled={loading || selectedEpisodeIndex <= 0}
                            >
                                <ChevronLeft size={16}/>
                                Previous
                            </button>
                            <button
                                type="button"
                                className="button-primary"
                                onClick={() => handleAdjacentEpisode(1)}
                                disabled={
                                    loading ||
                                    selectedEpisodeIndex < 0 ||
                                    selectedEpisodeIndex === episodes.length - 1
                                }
                            >
                                Next episode
                                <ChevronRight size={16}/>
                            </button>
                        </div>
                    )}

                    {streams.length > 0 && (
                        <section className="playback__section playback__stream-section">
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
                                        aria-pressed={selectedStream?.url === stream.url}
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
                </section>
            </div>
        </main>
    );
}
