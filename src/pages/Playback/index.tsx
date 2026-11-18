import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Captions,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FastForward,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Hls from "hls.js";

import PageHeader from "../../components/layout/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useSearchAnime, useUpdateEntry } from "../../hooks/useAniList";

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

const PLAYBACK_RATES = [1, 1.25, 1.5, 2];

function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function Playback() {
  const location = useLocation();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeEpisodeBtnRef = useRef<HTMLButtonElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const requestIdRef = useRef(0);
  const playbackCommandRef = useRef<Promise<void>>(Promise.resolve());
  const idleTimerRef = useRef<number | null>(null);
  const hudTimerRef = useRef<number | null>(null);

  const { isAuthenticated } = useAuth();
  const { updateEntry } = useUpdateEntry();

  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState<TranslationType>(() =>
    localStorage.getItem("playback-audio-preference") === "dub" ? "dub" : "sub",
  );
  const [autoPlayFromWatchNow] = useState(
    () => localStorage.getItem("playback-auto-play") !== "false",
  );

  const [results, setResults] = useState<SearchResult[]>([]);
  const [episodes, setEpisodes] = useState<string[]>([]);
  const [streams, setStreams] = useState<StreamLink[]>([]);

  const [selectedShow, setSelectedShow] = useState<SearchResult | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [selectedStream, setSelectedStream] = useState<StreamLink | null>(null);
  const completionSyncRef = useRef<string | null>(null);

  const [episodeFilter, setEpisodeFilter] = useState("");
  const [episodeLayout, setEpisodeLayout] = useState<"grid" | "list">("grid");

  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number>(0);
  const [lastActiveSubtitleIndex, setLastActiveSubtitleIndex] = useState<number>(0);
  const [hudMessage, setHudMessage] = useState<string | null>(null);

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

  const [manualLinkedId, setManualLinkedId] = useState<number | null>(null);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const { results: linkSearchResults } = useSearchAnime(
    showLinkPicker ? linkSearchQuery : "",
  );

  const effectiveMediaId =
    Number.isFinite(linkedMediaId) && linkedMediaId !== null && linkedMediaId > 0
      ? linkedMediaId
      : manualLinkedId;

  const linkedMediaType =
    typeof location.state === "object" &&
    location.state !== null &&
    "mediaType" in location.state
      ? String(location.state.mediaType)
      : null;

  const linkedEpisode =
    typeof location.state === "object" &&
    location.state !== null &&
    "episode" in location.state
      ? Number(location.state.episode)
      : null;

  const hasAniListLink =
    Number.isFinite(effectiveMediaId) &&
    effectiveMediaId !== null &&
    effectiveMediaId > 0;

  function showHud(text: string) {
    setHudMessage(text);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      setHudMessage(null);
    }, 950);
  }

  function revealControlsTemporarily() {
    setControlsVisible(true);
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 2500);
  }

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
    setCurrentTime(0);
    setDuration(0);
    setBufferedEnd(0);
    return queuePlaybackCommand(playbackStop);
  }

  useEffect(() => {
    if (!initialQuery) return;
    setQuery(initialQuery);
    void handleSearch(initialQuery, translation);
  }, [initialQuery]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
      requestIdRef.current += 1;
      hlsRef.current?.destroy();
      void queuePlaybackCommand(playbackStop).catch((reason: unknown) => {
        console.error("Failed to stop playback", reason);
      });
    };
  }, []);

  useEffect(() => {
    activeEpisodeBtnRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedEpisode, episodes.length]);

  function applySubtitleTrackModes(activeIdx = selectedSubtitleIndex) {
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = i === activeIdx ? "showing" : "disabled";
    }
  }

  useEffect(() => {
    const subs = selectedStream?.subtitles ?? [];
    if (subs.length === 0) {
      setSelectedSubtitleIndex(-1);
      return;
    }
    const defaultIdx = subs.findIndex((s) => s.default);
    const initialIdx = defaultIdx >= 0 ? defaultIdx : 0;
    setSelectedSubtitleIndex(initialIdx);
    setLastActiveSubtitleIndex(initialIdx);
  }, [selectedStream]);

  useEffect(() => {
    applySubtitleTrackModes(selectedSubtitleIndex);
  }, [selectedSubtitleIndex, selectedStream]);

  function selectSubtitleTrack(index: number) {
    setSelectedSubtitleIndex(index);
    if (index >= 0) {
      setLastActiveSubtitleIndex(index);
      const label =
        selectedStream?.subtitles?.[index]?.label || `Track ${index + 1}`;
      showHud(`Subtitles: ${label}`);
    } else {
      showHud("Subtitles: Off");
    }
  }

  function toggleSubtitlesQuick() {
    const subs = selectedStream?.subtitles ?? [];
    if (subs.length === 0) return;
    if (selectedSubtitleIndex >= 0) {
      selectSubtitleTrack(-1);
    } else {
      const target =
        lastActiveSubtitleIndex >= 0 && lastActiveSubtitleIndex < subs.length
          ? lastActiveSubtitleIndex
          : 0;
      selectSubtitleTrack(target);
    }
  }

  function cycleSubtitleTrack() {
    const subs = selectedStream?.subtitles ?? [];
    if (subs.length === 0) return;
    const next =
      selectedSubtitleIndex + 1 >= subs.length ? -1 : selectedSubtitleIndex + 1;
    selectSubtitleTrack(next);
  }

  function togglePlayPause() {
    const video = videoRef.current;
    if (!video || !selectedStream) return;
    if (video.paused) {
      void video.play().catch((err: unknown) => setError(String(err)));
      showHud("Play");
    } else {
      video.pause();
      setControlsVisible(true);
      showHud("Paused");
    }
  }

  function seekRelative(deltaSeconds: number, label?: string) {
    const video = videoRef.current;
    if (!video || !selectedStream) return;
    const maxTime = Number.isFinite(video.duration)
      ? Math.max(0, video.duration - 0.5)
      : Infinity;
    const nextTime = Math.max(0, Math.min(maxTime, video.currentTime + deltaSeconds));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    revealControlsTemporarily();
    showHud(
      label ??
        (deltaSeconds > 0 ? `+${deltaSeconds}s` : `${deltaSeconds}s`),
    );
  }

  function skipIntro85s() {
    seekRelative(85, "+85s Skip OP");
  }

  function changeVolume(nextVol: number) {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(1, nextVol));
    setVolume(clamped);
    setMuted(clamped === 0);
    if (video) {
      video.volume = clamped;
      video.muted = clamped === 0;
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
    showHud(nextMuted ? "Muted" : `Volume ${Math.round(volume * 100)}%`);
  }

  function cyclePlaybackRate() {
    const video = videoRef.current;
    const nextIdx = (PLAYBACK_RATES.indexOf(playbackRate) + 1) % PLAYBACK_RATES.length;
    const nextRate = PLAYBACK_RATES[nextIdx];
    setPlaybackRate(nextRate);
    if (video) video.playbackRate = nextRate;
    showHud(`${nextRate}x Speed`);
  }

  function toggleFullscreen() {
    const container = playerContainerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch((err: unknown) => setError(String(err)));
    } else {
      void container.requestFullscreen().catch((err: unknown) => setError(String(err)));
    }
  }

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
          seekRelative(-5);
          break;
        case "ArrowRight":
          event.preventDefault();
          seekRelative(5);
          break;
        case "s":
        case "S":
          event.preventDefault();
          skipIntro85s();
          break;
        case "ArrowUp":
          event.preventDefault();
          changeVolume(volume + 0.05);
          showHud(`Volume ${Math.round(Math.min(1, volume + 0.05) * 100)}%`);
          break;
        case "ArrowDown":
          event.preventDefault();
          changeVolume(volume - 0.05);
          showHud(`Volume ${Math.round(Math.max(0, volume - 0.05) * 100)}%`);
          break;
        case "m":
        case "M":
          event.preventDefault();
          toggleMute();
          break;
        case "c":
        case "C":
          event.preventDefault();
          cycleSubtitleTrack();
          break;
        case " ":
        case "k":
        case "K":
          event.preventDefault();
          togglePlayPause();
          break;
        case "n":
        case "N":
          event.preventDefault();
          handleAdjacentEpisode(1);
          break;
        case "p":
        case "P":
          event.preventDefault();
          handleAdjacentEpisode(-1);
          break;
        case "f":
        case "F":
          event.preventDefault();
          toggleFullscreen();
          break;
      }
    }

    window.addEventListener("keydown", handlePlayerKeyDown);
    return () => window.removeEventListener("keydown", handlePlayerKeyDown);
  }, [selectedStream, volume, muted, episodes, selectedEpisode, selectedSubtitleIndex]);

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
      const episodeToSelect =
        linkedEpisode !== null &&
        Number.isInteger(linkedEpisode) &&
        linkedEpisode > 0
          ? linkedEpisode
          : null;
      const exactMatch = autoPlayFromWatchNow
        ? result.find(
            (show) =>
              show.name.trim().replace(/\s+/g, " ").toLowerCase() ===
              trimmedQuery.replace(/\s+/g, " ").toLowerCase(),
          )
        : null;
      const showToOpen = autoPlayFromWatchNow
        ? exactMatch ??
          (episodeToSelect !== null && result.length === 1 ? result[0] : null)
        : null;
      if (showToOpen) {
        void handleSelectShow(showToOpen, episodeToSelect, nextTranslation);
      } else {
        setSelectedShow(null);
        setEpisodes([]);
        setStreams([]);
        setSelectedStream(null);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) setError(String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  async function handleSelectShow(
    show: SearchResult,
    episodeToSelect: number | null = null,
    activeTranslation: TranslationType = translation,
  ) {
    const requestId = ++requestIdRef.current;
    completionSyncRef.current = null;
    setSelectedShow(show);
    setSelectedEpisode("");
    setEpisodeFilter("");
    setEpisodes([]);
    setStreams([]);
    setSelectedStream(null);
    setError(null);
    setLoading(true);

    try {
      await stopCurrentPlayback();
      if (requestId !== requestIdRef.current) return;

      const result = await getPlaybackEpisodes(show.id, activeTranslation);
      if (requestId !== requestIdRef.current) return;
      setEpisodes(result);
      setEpisodeLayout(result.length > 8 ? "grid" : "list");

      const episode =
        episodeToSelect === null
          ? result[0]
          : result.find((item) => {
              const match =
                item.match(/^episode\s+(\d+)$/i) ?? item.match(/^\s*(\d+)\s*$/);
              return match ? Number(match[1]) === episodeToSelect : false;
            }) ?? result[episodeToSelect - 1];

      if (episode) {
        if (autoPlayFromWatchNow || episodeToSelect !== null) {
          await handleLoadStreams(episode, show, activeTranslation);
        } else {
          setSelectedEpisode(episode);
        }
      }
    } catch (err) {
      if (requestId === requestIdRef.current) setError(String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  async function handleSwitchTranslation(nextTranslation: TranslationType) {
    if (nextTranslation === translation) return;
    setTranslation(nextTranslation);

    if (selectedShow) {
      const currentEpNum = Number(selectedEpisode);
      await handleSelectShow(
        selectedShow,
        Number.isFinite(currentEpNum) && currentEpNum > 0 ? currentEpNum : null,
        nextTranslation,
      );
    } else if (query.trim()) {
      await handleSearch(query, nextTranslation);
    }
  }

  function handleBackToResults() {
    requestIdRef.current += 1;
    void stopCurrentPlayback().catch((reason: unknown) =>
      setError(String(reason)),
    );
    setSelectedShow(null);
    setSelectedEpisode("");
    setEpisodeFilter("");
    setEpisodes([]);
    setStreams([]);
    setSelectedStream(null);
    setPlaying(false);
    setLoading(false);
    setError(null);
  }

  async function syncEpisodeProgress(nextEpisode: string | number) {
    if (!hasAniListLink || effectiveMediaId === null) return;

    const numericEpisode = Number(nextEpisode);
    if (!Number.isFinite(numericEpisode) || numericEpisode <= 0) return;

    try {
      await updateEntry({
        mediaId: effectiveMediaId,
        status: "CURRENT",
        progress: numericEpisode,
      });
    } catch (reason) {
      console.error("AniList progress sync failed", reason);
    }
  }

  async function handleLoadStreams(
    episode = selectedEpisode,
    show = selectedShow,
    activeTranslation: TranslationType = translation,
  ) {
    if (!show || !episode) return;

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
        show.id,
        episode,
        activeTranslation,
      );
      if (requestId !== requestIdRef.current) return;

      setStreams(result);

      if (result[0]) {
        await handlePlay(result[0], requestId);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) setError(String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  function handleSelectEpisode(episode: string) {
    void handleLoadStreams(episode);
  }

  function handleAdjacentEpisode(direction: -1 | 1) {
    const currentIndex = episodes.indexOf(selectedEpisode);
    if (currentIndex < 0) return;
    const nextEpisode = episodes[currentIndex + direction];
    if (nextEpisode) handleSelectEpisode(nextEpisode);
  }

  async function handlePlay(
    stream: StreamLink,
    requestId = ++requestIdRef.current,
  ) {
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

      video.volume = volume;
      video.muted = muted;
      video.playbackRate = playbackRate;

      if (stream.hls) {
        const hls = new Hls();
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (requestId !== requestIdRef.current || hlsRef.current !== hls)
            return;
          video.playbackRate = playbackRate;
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
    } catch (err) {
      if (requestId === requestIdRef.current) setError(String(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selectedEpisode || !selectedStream) return;

    const handleTimeUpdate = () => {
      const dur = Number(video.duration);
      const cur = Number(video.currentTime);
      setCurrentTime(Number.isFinite(cur) ? cur : 0);
      if (Number.isFinite(dur) && dur > 0) setDuration(dur);

      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }

      const progress = dur > 0 ? cur / dur : 0;
      if (progress >= 0.75 && completionSyncRef.current !== selectedEpisode) {
        completionSyncRef.current = selectedEpisode;
        void syncEpisodeProgress(selectedEpisode);
      }
    };

    const handleLoadedMetadata = () => {
      const dur = Number(video.duration);
      if (Number.isFinite(dur) && dur > 0) setDuration(dur);
      applySubtitleTrackModes();
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [selectedEpisode, selectedStream]);

  const filteredEpisodes = useMemo(() => {
    const q = episodeFilter.trim().toLowerCase();
    if (!q) return episodes;
    return episodes.filter((ep) => ep.toLowerCase().includes(q));
  }, [episodes, episodeFilter]);

  const selectedEpisodeIndex = episodes.indexOf(selectedEpisode);
  const canGoPrev = !loading && selectedEpisodeIndex > 0;
  const canGoNext =
    !loading &&
    selectedEpisodeIndex >= 0 &&
    selectedEpisodeIndex < episodes.length - 1;

  const playedPercent =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPercent =
    duration > 0 ? Math.min(100, (bufferedEnd / duration) * 100) : 0;

  const showFloatingSkipIntro =
    Boolean(selectedStream) &&
    playing &&
    duration > 300 &&
    currentTime >= 5 &&
    currentTime <= 210;

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
    <div className="playback">
      <PageHeader
        icon={<Play size={20} />}
        title={selectedShow?.name ?? "Playback"}
        subtitle={
          selectedEpisode
            ? `Episode ${selectedEpisode} · ${translation === "sub" ? "Subtitled" : "Dubbed"}`
            : selectedShow
              ? "Select an episode from the navigator to start watching."
              : "Search for an anime, select an episode, and start watching."
        }
        meta={pageStatus}
      />

      {error && (
        <section className="playback__error" role="alert">
          <div className="playback__error-icon">
            <AlertCircle size={15} aria-hidden="true" />
          </div>

          <div>
            <strong>Playback error</strong>
            <span>{error}</span>
          </div>
        </section>
      )}

      <div className="playback__content">
        {/* --------------------------------------------------------
            Left Column: Video Player & Transport Bar (DOM First)
        --------------------------------------------------------- */}
        <section className="playback__panel--player">
          <div
            ref={playerContainerRef}
            className={`playback__video ${
              !controlsVisible && playing ? "playback__video--idle" : ""
            }`}
            onMouseMove={revealControlsTemporarily}
            onMouseLeave={() => {
              if (playing) setControlsVisible(false);
            }}
          >
            <video
              ref={videoRef}
              aria-label="Video player"
              playsInline
              preload="metadata"
              onClick={togglePlayPause}
              onDoubleClick={toggleFullscreen}
              onPlay={() => {
                setPlaying(true);
                revealControlsTemporarily();
              }}
              onPause={() => {
                setPlaying(false);
                setControlsVisible(true);
              }}
              onEnded={() => {
                if (
                  selectedEpisode &&
                  completionSyncRef.current !== selectedEpisode
                ) {
                  completionSyncRef.current = selectedEpisode;
                  void syncEpisodeProgress(selectedEpisode);
                }
              }}
            >
              {selectedStream?.subtitles?.map((sub, idx) => (
                <track
                  key={`${sub.url}-${idx}`}
                  kind="subtitles"
                  src={sub.url}
                  label={sub.label}
                  default={sub.default ?? idx === 0}
                />
              ))}
            </video>

            {hudMessage && (
              <div className="playback__hud" role="status" aria-live="polite">
                {hudMessage}
              </div>
            )}

            {loading && selectedShow && (
              <div className="playback__video-loading">
                <Loader2
                  size={32}
                  className="page-state__spinner"
                  aria-hidden="true"
                />
                <span>
                  {selectedEpisode
                    ? `Loading Episode ${selectedEpisode}...`
                    : "Loading episodes..."}
                </span>
              </div>
            )}

            {!selectedStream && !loading && (
              <div className="playback__video-placeholder">
                <div className="playback__video-placeholder-icon">
                  <Play size={22} aria-hidden="true" />
                </div>
                <strong>Nothing playing</strong>
                <span>
                  {selectedShow
                    ? "Pick an episode on the right to start playback."
                    : "Search for an anime in the panel on the right to begin."}
                </span>
              </div>
            )}

            {showFloatingSkipIntro && (
              <button
                type="button"
                className="playback__floating-skip"
                onClick={(e) => {
                  e.stopPropagation();
                  skipIntro85s();
                }}
              >
                <FastForward size={15} aria-hidden="true" />
                Skip Intro (+85s)
              </button>
            )}

            {selectedStream && (
              <div
                className={`playback-controls ${
                  controlsVisible || !playing
                    ? "playback-controls--visible"
                    : ""
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Scrub / Seek Bar */}
                <div className="playback-controls__timeline">
                  <div className="playback-controls__track">
                    <div
                      className="playback-controls__buffered"
                      style={{ width: `${bufferedPercent}%` }}
                    />
                    <div
                      className="playback-controls__played"
                      style={{ width: `${playedPercent}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    className="playback-controls__seek"
                    aria-label="Seek timeline"
                    min={0}
                    max={duration > 0 ? duration : 100}
                    step={0.5}
                    value={currentTime}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setCurrentTime(next);
                      if (videoRef.current) videoRef.current.currentTime = next;
                    }}
                  />
                </div>

                {/* Main Controls Row */}
                <div className="playback-controls__bar">
                  <div className="playback-controls__group">
                    <button
                      type="button"
                      className="playback-controls__btn"
                      onClick={togglePlayPause}
                      aria-label={playing ? "Pause" : "Play"}
                      title={playing ? "Pause (Space)" : "Play (Space)"}
                    >
                      {playing ? (
                        <Pause size={18} fill="currentColor" aria-hidden="true" />
                      ) : (
                        <Play size={18} fill="currentColor" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="playback-controls__btn"
                      onClick={() => seekRelative(-5)}
                      aria-label="Rewind 5 seconds"
                      title="Rewind 5s (←)"
                    >
                      <RotateCcw size={16} aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="playback-controls__pill playback-controls__pill--accent"
                      onClick={skipIntro85s}
                      aria-label="Skip forward 85 seconds"
                      title="Skip OP +85s (S)"
                    >
                      <FastForward size={14} aria-hidden="true" />
                      +85s
                    </button>

                    {canGoNext && (
                      <button
                        type="button"
                        className="playback-controls__btn"
                        onClick={() => handleAdjacentEpisode(1)}
                        aria-label="Next episode"
                        title="Next episode (N)"
                      >
                        <SkipForward size={16} aria-hidden="true" />
                      </button>
                    )}

                    <div className="playback-controls__volume">
                      <button
                        type="button"
                        className="playback-controls__btn"
                        onClick={toggleMute}
                        aria-label={muted ? "Unmute" : "Mute"}
                        title="Mute (M)"
                      >
                        {muted || volume === 0 ? (
                          <VolumeX size={17} aria-hidden="true" />
                        ) : (
                          <Volume2 size={17} aria-hidden="true" />
                        )}
                      </button>

                      <input
                        type="range"
                        className="playback-controls__volume-slider"
                        aria-label="Volume"
                        min={0}
                        max={1}
                        step={0.05}
                        value={muted ? 0 : volume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                      />
                    </div>

                    <span className="playback-controls__time">
                      {formatMediaTime(currentTime)} / {formatMediaTime(duration)}
                    </span>
                  </div>

                  <div className="playback-controls__group">
                    {selectedStream.subtitles.length > 0 && (
                      <div className="playback-controls__subtitles">
                        <button
                          type="button"
                          className={`playback-controls__pill ${
                            selectedSubtitleIndex >= 0
                              ? "playback-controls__pill--active"
                              : ""
                          }`}
                          onClick={toggleSubtitlesQuick}
                          aria-pressed={selectedSubtitleIndex >= 0}
                          title="Toggle Subtitles (C to cycle)"
                        >
                          <Captions size={14} aria-hidden="true" />
                          CC
                        </button>

                        <select
                          className="playback-controls__select"
                          aria-label="Subtitle track"
                          value={selectedSubtitleIndex}
                          onChange={(e) =>
                            selectSubtitleTrack(Number(e.target.value))
                          }
                        >
                          <option value={-1}>Subtitles: Off</option>
                          {selectedStream.subtitles.map((sub, idx) => (
                            <option key={`${sub.url}-${idx}`} value={idx}>
                              {sub.label || `Track ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      className="playback-controls__pill"
                      onClick={cyclePlaybackRate}
                      aria-label={`Playback speed ${playbackRate}x`}
                      title="Playback speed"
                    >
                      {playbackRate}x
                    </button>

                    {streams.length > 1 && (
                      <select
                        className="playback-controls__select"
                        aria-label="Stream source and quality"
                        value={selectedStream.url}
                        onChange={(e) => {
                          const target = streams.find(
                            (s) => s.url === e.target.value,
                          );
                          if (target) void handlePlay(target);
                        }}
                      >
                        {streams.map((s, idx) => (
                          <option key={`${s.url}-${idx}`} value={s.url}>
                            {s.resolution} · {s.provider}
                          </option>
                        ))}
                      </select>
                    )}

                    <button
                      type="button"
                      className="playback-controls__btn"
                      onClick={toggleFullscreen}
                      aria-label={
                        isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      title="Fullscreen (F)"
                    >
                      {isFullscreen ? (
                        <Minimize size={17} aria-hidden="true" />
                      ) : (
                        <Maximize size={17} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------
              Under-Player Transport & Source Bar
          ------------------------------------------------------- */}
          {selectedShow && (
            <div className="playback__transport-bar">
              <div className="playback__transport-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => handleAdjacentEpisode(-1)}
                  disabled={!canGoPrev}
                  title="Previous episode (P)"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Prev
                </button>

                <button
                  type="button"
                  className="button-secondary playback__skip-op-btn"
                  onClick={skipIntro85s}
                  disabled={!selectedStream}
                  title="Skip opening +85s (S)"
                >
                  <FastForward size={15} aria-hidden="true" />
                  +85s Skip OP
                </button>

                <button
                  type="button"
                  className="button-primary"
                  onClick={() => handleAdjacentEpisode(1)}
                  disabled={!canGoNext}
                  title="Next episode (N)"
                >
                  Next Ep
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>

              <div className="playback__transport-meta">
                {streams.length > 0 && (
                  <div className="playback__source-selector">
                    <span className="playback__source-label">Source</span>
                    <select
                      className="form-select playback__source-select"
                      aria-label="Select stream source"
                      value={selectedStream?.url ?? ""}
                      onChange={(e) => {
                        const next = streams.find(
                          (s) => s.url === e.target.value,
                        );
                        if (next) void handlePlay(next);
                      }}
                    >
                      {streams.map((s, idx) => (
                        <option key={`${s.url}-${idx}`} value={s.url}>
                          {s.resolution} · {s.provider} ({s.hls ? "HLS" : "Direct"}
                          {s.subtitles.length > 0
                            ? ` · CC ${s.subtitles.length}`
                            : ""}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedStream && selectedStream.subtitles.length > 0 && (
                  <div className="playback__source-selector">
                    <span className="playback__source-label">Subtitles</span>
                    <select
                      className="form-select playback__source-select"
                      aria-label="Select subtitle track"
                      value={selectedSubtitleIndex}
                      onChange={(e) =>
                        selectSubtitleTrack(Number(e.target.value))
                      }
                    >
                      <option value={-1}>Off</option>
                      {selectedStream.subtitles.map((sub, idx) => (
                        <option key={`${sub.url}-${idx}`} value={idx}>
                          {sub.label || `Track ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {hasAniListLink && effectiveMediaId ? (
                  <span
                    className="playback__sync-pill playback__sync-pill--active"
                    title={`Syncs ${linkedMediaType ?? "anime"} progress at 75% watched`}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    AniList Sync On
                  </span>
                ) : (
                  isAuthenticated && (
                    <button
                      type="button"
                      className="playback__sync-pill playback__sync-pill--link"
                      onClick={() => {
                        setLinkSearchQuery(selectedShow.name);
                        setShowLinkPicker((v) => !v);
                      }}
                    >
                      <Link2 size={14} aria-hidden="true" />
                      Link AniList
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {showLinkPicker && !hasAniListLink && isAuthenticated && (
            <div className="playback__link-picker">
              <div className="playback__link-picker-header">
                <strong>Link to AniList for automatic 75% progress sync</strong>
                <button
                  type="button"
                  className="playback__back-icon"
                  onClick={() => setShowLinkPicker(false)}
                  aria-label="Close AniList linker"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
              <input
                type="text"
                className="form-input"
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                placeholder="Search AniList title..."
                aria-label="Search AniList title to link"
              />
              <div className="playback__results">
                {linkSearchResults?.media?.slice(0, 4).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="playback__result"
                    onClick={() => {
                      setManualLinkedId(m.id);
                      setShowLinkPicker(false);
                    }}
                  >
                    <div className="playback__result-main">
                      <strong>
                        {m.title.userPreferred ||
                          m.title.english ||
                          m.title.romaji}
                      </strong>
                      <span>{m.format ?? "ANIME"}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* --------------------------------------------------------
            Right Column: Navigator Sidebar (DOM Second)
        --------------------------------------------------------- */}
        <aside className="playback__panel playback__panel--sidebar">
          {!selectedShow && (
            <div className="playback__toolbar">
              <div className="playback__search-input">
                <span aria-hidden="true">
                  <Search size={16} />
                </span>

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

              <div className="search-type" role="group" aria-label="Audio language">
                <button
                  type="button"
                  className={`search-type__button ${
                    translation === "sub" ? "search-type__button--active" : ""
                  }`}
                  onClick={() => void handleSwitchTranslation("sub")}
                >
                  Sub
                </button>
                <button
                  type="button"
                  className={`search-type__button ${
                    translation === "dub" ? "search-type__button--active" : ""
                  }`}
                  onClick={() => void handleSwitchTranslation("dub")}
                >
                  Dub
                </button>
              </div>

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
              <div className="playback__episode-header">
                <div className="playback__episode-summary">
                  <button
                    type="button"
                    className="playback__back-icon"
                    onClick={handleBackToResults}
                    aria-label="Back to search results"
                    title="Back to search results"
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </button>
                  <div className="playback__episode-title-block">
                    <strong title={selectedShow.name}>
                      {selectedShow.name}
                    </strong>
                    <span>
                      {episodes.length
                        ? `${episodes.length} episodes · ${selectedShow.provider}`
                        : loading
                          ? "Loading episodes…"
                          : "No episodes found"}
                    </span>
                  </div>
                </div>

                <div
                  className="search-type"
                  role="group"
                  aria-label="Switch Sub or Dub"
                >
                  <button
                    type="button"
                    className={`search-type__button ${
                      translation === "sub" ? "search-type__button--active" : ""
                    }`}
                    disabled={loading}
                    onClick={() => void handleSwitchTranslation("sub")}
                  >
                    Sub
                  </button>
                  <button
                    type="button"
                    className={`search-type__button ${
                      translation === "dub" ? "search-type__button--active" : ""
                    }`}
                    disabled={loading}
                    onClick={() => void handleSwitchTranslation("dub")}
                  >
                    Dub
                  </button>
                </div>
              </div>

              {episodes.length > 6 && (
                <div className="playback__episode-controls">
                  <div className="playback__episode-filter">
                    <Search
                      size={14}
                      className="playback__episode-filter-icon"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      value={episodeFilter}
                      onChange={(e) => setEpisodeFilter(e.target.value)}
                      placeholder="Jump to ep..."
                      aria-label="Filter episodes"
                    />
                    {episodeFilter && (
                      <button
                        type="button"
                        className="playback__episode-filter-clear"
                        onClick={() => setEpisodeFilter("")}
                        aria-label="Clear episode filter"
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  <div
                    className="search-type"
                    role="group"
                    aria-label="Episode view mode"
                  >
                    <button
                      type="button"
                      className={`search-type__button ${
                        episodeLayout === "grid"
                          ? "search-type__button--active"
                          : ""
                      }`}
                      onClick={() => setEpisodeLayout("grid")}
                      aria-label="Number grid view"
                      title="Number grid"
                    >
                      <LayoutGrid size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={`search-type__button ${
                        episodeLayout === "list"
                          ? "search-type__button--active"
                          : ""
                      }`}
                      onClick={() => setEpisodeLayout("list")}
                      aria-label="List view"
                      title="List view"
                    >
                      <List size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}

              <div
                className={
                  episodeLayout === "grid"
                    ? "playback__episode-grid"
                    : "playback__episode-list"
                }
              >
                {filteredEpisodes.map((episode) => {
                  const isActive = selectedEpisode === episode;
                  return (
                    <button
                      key={episode}
                      ref={isActive ? activeEpisodeBtnRef : undefined}
                      type="button"
                      aria-pressed={isActive}
                      className={
                        episodeLayout === "grid"
                          ? `playback__episode-cell ${
                              isActive ? "playback__episode-cell--active" : ""
                            }`
                          : `playback__episode-option ${
                              isActive ? "playback__episode-option--active" : ""
                            }`
                      }
                      onClick={() => handleSelectEpisode(episode)}
                      disabled={loading}
                      title={`Episode ${episode}`}
                    >
                      {episodeLayout === "grid" ? (
                        <span>{episode}</span>
                      ) : (
                        <>
                          <span>Episode {episode}</span>
                          {isActive && (
                            <span className="playback__episode-current">
                              {loading
                                ? "Loading…"
                                : selectedStream
                                  ? "Playing"
                                  : "Selected"}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="playback__shortcuts-hint">
                <span>
                  <kbd>Space</kbd> Play · <kbd>S</kbd> +85s · <kbd>←</kbd>/
                  <kbd>→</kbd> ±5s · <kbd>C</kbd> Subtitles · <kbd>N</kbd>/
                  <kbd>P</kbd> Ep · <kbd>F</kbd> Fullscreen
                </span>
              </div>
            </section>
          )}

          {!selectedShow && results.length > 0 && (
            <section className="playback__section">
              <div className="playback__section-header">
                <div>
                  <span className="playback__label">SEARCH RESULTS</span>
                  <h2>Choose an anime</h2>
                </div>

                <span className="playback__section-count">
                  {results.length}
                </span>
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
                      <span className="playback__result-count">
                        {show.episodes} ep
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!loading &&
            !results.length &&
            !selectedShow &&
            !streams.length && (
              <div className="playback__empty-state">
                <div className="playback__empty-state-icon">
                  <Search size={20} aria-hidden="true" />
                </div>
                <strong>
                  {query.trim() ? "No anime found" : "Search for a title"}
                </strong>
                <span>
                  {query.trim()
                    ? "Try another title or switch between Sub and Dub."
                    : "Find an anime to load episodes and start watching."}
                </span>
              </div>
            )}
        </aside>
      </div>
    </div>
  );
}
