// context/PlayerContext.tsx

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import Hls from "hls.js";

import {
  playbackPrepareStream,
  playbackStop,
} from "../api/playback";

import type {
  SearchResult,
  StreamLink,
} from "../types/playback";

interface PlayerState {
  show: SearchResult | null;
  episode: string;
  stream: StreamLink | null;
  playing: boolean;
  loading: boolean;
  error: string | null;
}

interface PlayerContextValue extends PlayerState {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  play: (
    stream: StreamLink,
    show: SearchResult,
    episode: string,
  ) => Promise<void>;
  stop: () => Promise<void>;
}

const PlayerContext =
  createContext<PlayerContextValue | null>(null);

export function PlayerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const hlsRef = useRef<Hls | null>(null);

  const [show, setShow] =
    useState<SearchResult | null>(null);

  const [episode, setEpisode] = useState("");

  const [stream, setStream] =
    useState<StreamLink | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      hlsRef.current?.destroy();
      void playbackStop();
    };
  }, []);

  async function play(
    nextStream: StreamLink,
    nextShow: SearchResult,
    nextEpisode: string,
  ) {
    const video = videoRef.current;

    if (!video) {
      setError("Video element is not available.");
      return;
    }

    setLoading(true);
    setError(null);

    hlsRef.current?.destroy();
    hlsRef.current = null;

    try {
      const url =
        await playbackPrepareStream(nextStream);

      setShow(nextShow);
      setEpisode(nextEpisode);
      setStream(nextStream);
      setPlaying(false);

      if (nextStream.hls) {
        if (!Hls.isSupported()) {
          throw new Error(
            "HLS is not supported by this WebView.",
          );
        }

        const hls = new Hls();

        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(
          Hls.Events.MANIFEST_PARSED,
          () => {
            void video.play();
          },
        );

        hls.on(
          Hls.Events.ERROR,
          (_, data) => {
            if (data.fatal) {
              setError(
                `HLS error: ${data.details}`,
              );
            }
          },
        );
      } else {
        video.src = url;
        await video.play();
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function stop() {
    hlsRef.current?.destroy();
    hlsRef.current = null;

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    setPlaying(false);
    setStream(null);
    setShow(null);
    setEpisode("");
    setError(null);

    await playbackStop();
  }

  return (
    <PlayerContext.Provider
      value={{
        videoRef,
        show,
        episode,
        stream,
        playing,
        loading,
        error,
        play,
        stop,
      }}
    >
      {children}

      <video
        ref={videoRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error(
      "usePlayer must be used inside PlayerProvider",
    );
  }

  return context;
}