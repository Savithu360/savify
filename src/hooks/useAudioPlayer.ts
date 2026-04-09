import { useState, useCallback, useRef, useEffect } from "react";
import { ITrack } from "@/types";
import { mcpAudioService } from "@/services/MCPAudioService";

interface AudioPlayerState {
  currentTrack: ITrack | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  isShuffled: boolean;
  repeatMode: "off" | "one" | "all";
  isMinimized: boolean;
  queue: ITrack[];
  currentIndex: number;
  likedTracks: ITrack[];
  recentlyPlayed: ITrack[];
}

const LIKED_KEY = "savify_liked";
const RECENT_KEY = "savify_recent";
const MAX_RECENT = 30;

const loadJSON = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return fallback;
};

const saveJSON = (key: string, value: unknown): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
};

const getSavedVolume = (): number => {
    try {
      const saved = localStorage.getItem("savify_volume");
      if (saved !== null) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return parsed;
      }
    } catch {
      // localStorage unavailable
    }
    return 80;
  };

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioPlayerState>({
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    volume: getSavedVolume(),
    isShuffled: false,
    repeatMode: "off",
    isMinimized: false,
    queue: [],
    currentIndex: -1,
    likedTracks: loadJSON<ITrack[]>(LIKED_KEY, []),
    recentlyPlayed: loadJSON<ITrack[]>(RECENT_KEY, []),
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const simulationInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Always-current mirror of state so event handlers set up with [] deps never read stale closures
  const stateRef = useRef<AudioPlayerState>(state);
  // Used by handleEnded to signal which track to auto-advance to
  const autoAdvanceRef = useRef<ITrack | null>(null);
  const [autoAdvanceTick, setAutoAdvanceTick] = useState(0);

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
      simulationInterval.current = null;
    }
  };

  const failPlayback = (reason: string) => {
    console.warn("Playback failed:", reason);

    stopSimulation();

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    setState((prev) => ({
      ...prev,
      isPlaying: false,
      progress: 0,
    }));
  };

  // Keep stateRef current so the "ended" handler always sees the latest queue/index/repeatMode
  useEffect(() => {
    stateRef.current = state;
  });

  const setQueue = useCallback((tracks: ITrack[], currentTrackId?: string) => {
    const safeTracks = Array.isArray(tracks) ? tracks : [];
    const index = currentTrackId
      ? safeTracks.findIndex((track) => track.id === currentTrackId)
      : -1;

    setState((prev) => ({
      ...prev,
      queue: safeTracks,
      currentIndex: index,
    }));
  }, []);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";

    const audio = audioRef.current;

    const handleEnded = () => {
      const { queue, currentIndex, repeatMode, currentTrack } = stateRef.current;

      // repeat-one: restart the same track immediately
      if (repeatMode === "one" && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {
          setState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
        });
        return;
      }

      // Resolve current position in queue
      let resolvedIndex = currentIndex;
      if (resolvedIndex < 0 && currentTrack && queue.length > 0) {
        resolvedIndex = queue.findIndex((t) => t.id === currentTrack.id);
      }

      const nextIndex =
        resolvedIndex + 1 < queue.length
          ? resolvedIndex + 1
          : repeatMode === "all"
          ? 0
          : -1;

      if (nextIndex !== -1 && queue[nextIndex]) {
        // Store the next track and signal the auto-advance effect
        autoAdvanceRef.current = queue[nextIndex];
        setAutoAdvanceTick((n) => n + 1);
      } else {
        // End of queue, no repeat — stop cleanly
        setState((prev) => ({ ...prev, isPlaying: false, progress: 0 }));
      }
    };

    const handleLoadStart = () => {
      // audio loading started
    };

    const handleCanPlay = () => {
      // audio ready to play
    };

    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      failPlayback("Audio element emitted an error event");
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);

      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      stopSimulation();
    };
  }, []);

  useEffect(() => {
    if (state.isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        const audio = audioRef.current;

        if (audio && audio.duration && Number.isFinite(audio.duration)) {
          const currentProgress = (audio.currentTime / audio.duration) * 100;
          setState((prev) => ({ ...prev, progress: currentProgress }));
        }
      }, 250);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      stopSimulation();
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
        progressInterval.current = null;
      }

      stopSimulation();
    };
  }, [state.isPlaying]);

  const playTrack = useCallback(
    async (track: ITrack) => {
      stopSimulation();

      if (state.currentTrack?.id === track.id) {
        if (state.isPlaying) {
          audioRef.current?.pause();
          stopSimulation();
          setState((prev) => ({ ...prev, isPlaying: false }));
        } else {
          if (audioRef.current?.src) {
            try {
              await audioRef.current.play();
              setState((prev) => ({ ...prev, isPlaying: true }));
            } catch (error) {
              failPlayback(
                `resume failed: ${(error as Error).name} - ${(error as Error).message}`
              );
            }
          } else {
            failPlayback("Cannot resume because no audio source is loaded");
          }
        }
        return;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      }

      setState((prev) => ({
        ...prev,
        currentTrack: track,
        isPlaying: false,
        progress: 0,
        currentIndex:
          prev.queue.length > 0
            ? prev.queue.findIndex((item) => item.id === track.id)
            : prev.currentIndex,
      }));

      try {
        let enhancedTrack: ITrack;

        if (track.preview_url) {
          enhancedTrack = track;
        } else {
          enhancedTrack = await mcpAudioService.enhanceTrackWithPreview(track);
        }

        setState((prev) => ({
          ...prev,
          currentTrack: enhancedTrack,
          currentIndex:
            prev.queue.length > 0
              ? prev.queue.findIndex((item) => item.id === enhancedTrack.id)
              : prev.currentIndex,
        }));

        if (audioRef.current && enhancedTrack.preview_url) {
          const audio = audioRef.current;
          audio.src = enhancedTrack.preview_url;
          audio.volume = state.volume / 100;
          audio.load();

          try {
            await audio.play();
            setState((prev) => {
              // Add to recently played, dedupe, cap at MAX_RECENT
              const without = prev.recentlyPlayed.filter((t) => t.id !== enhancedTrack.id);
              const updated = [enhancedTrack, ...without].slice(0, MAX_RECENT);
              saveJSON(RECENT_KEY, updated);
              return { ...prev, isPlaying: true, recentlyPlayed: updated };
            });
          } catch (error) {
            failPlayback(
              `audio.play() rejected: ${(error as Error).name} - ${(error as Error).message}`
            );
          }
        } else {
          failPlayback("No preview URL available for this track");
        }
      } catch (error) {
        console.error("❌ MCP service error:", error);
        failPlayback("Could not provide a playable preview URL");
      }
    },
    [state.currentTrack?.id, state.isPlaying, state.volume]
  );

  // Auto-advance: fires when handleEnded signals a next track via autoAdvanceTick
  useEffect(() => {
    if (autoAdvanceTick === 0) return; // skip initial mount
    const nextTrack = autoAdvanceRef.current;
    if (!nextTrack) return;
    autoAdvanceRef.current = null;
    playTrack(nextTrack);
  }, [autoAdvanceTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(async () => {
    if (!state.currentTrack) return;

    if (state.isPlaying) {
      audioRef.current?.pause();
      stopSimulation();
      setState((prev) => ({ ...prev, isPlaying: false }));
    } else {
      if (audioRef.current?.src) {
        try {
          await audioRef.current.play();
          setState((prev) => ({ ...prev, isPlaying: true }));
        } catch (error) {
          failPlayback(
            `toggle play failed: ${(error as Error).name} - ${(error as Error).message}`
          );
        }
      } else {
        failPlayback("Cannot resume because no audio source is loaded");
      }
    }
  }, [state.currentTrack, state.isPlaying]);

  const skipNext = useCallback(async () => {
    if (!state.queue.length) return;

    let nextIndex = state.currentIndex;

    if (nextIndex < 0 && state.currentTrack) {
      nextIndex = state.queue.findIndex((track) => track.id === state.currentTrack?.id);
    }

    if (nextIndex < 0) return;

    const targetIndex =
      nextIndex + 1 < state.queue.length
        ? nextIndex + 1
        : state.repeatMode === "all"
        ? 0
        : -1;

    if (targetIndex === -1) return;

    const nextTrack = state.queue[targetIndex];
    if (!nextTrack) return;

    await playTrack(nextTrack);
  }, [state.queue, state.currentIndex, state.currentTrack, state.repeatMode, playTrack]);

  const skipPrevious = useCallback(async () => {
    if (!state.queue.length) return;

    let prevIndex = state.currentIndex;

    if (prevIndex < 0 && state.currentTrack) {
      prevIndex = state.queue.findIndex((track) => track.id === state.currentTrack?.id);
    }

    if (prevIndex < 0) return;

    const targetIndex =
      prevIndex - 1 >= 0
        ? prevIndex - 1
        : state.repeatMode === "all"
        ? state.queue.length - 1
        : -1;

    if (targetIndex === -1) return;

    const prevTrack = state.queue[targetIndex];
    if (!prevTrack) return;

    await playTrack(prevTrack);
  }, [state.queue, state.currentIndex, state.currentTrack, state.repeatMode, playTrack]);

  const seek = useCallback((position: number) => {
    setState((prev) => ({ ...prev, progress: position }));

    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (position / 100) * audioRef.current.duration;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState((prev) => ({ ...prev, volume }));

    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }

    try {
      localStorage.setItem("savify_volume", String(volume));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((prev) => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((prev) => {
      const modes: Array<"off" | "one" | "all"> = ["off", "one", "all"];
      const currentIndex = modes.indexOf(prev.repeatMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...prev, repeatMode: nextMode };
    });
  }, []);

  const toggleFavorite = useCallback((track?: ITrack) => {
    const target = track ?? stateRef.current.currentTrack;
    if (!target) return;

    setState((prev) => {
      const alreadyLiked = prev.likedTracks.some((t) => t.id === target.id);
      const updated = alreadyLiked
        ? prev.likedTracks.filter((t) => t.id !== target.id)
        : [target, ...prev.likedTracks];

      saveJSON(LIKED_KEY, updated);
      return { ...prev, likedTracks: updated };
    });
  }, []);

  const isLiked = useCallback(
    (trackId: string) => state.likedTracks.some((t) => t.id === trackId),
    [state.likedTracks]
  );

  const toggleMinimize = useCallback(() => {
    setState((prev) => ({ ...prev, isMinimized: !prev.isMinimized }));
  }, []);

  const closePlayer = useCallback(() => {
    stopSimulation();

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }

    setState({
      currentTrack: null,
      isPlaying: false,
      progress: 0,
      volume: 80,
      isShuffled: false,
      repeatMode: "off",
      isMinimized: false,
      queue: [],
      currentIndex: -1,
    });
  }, []);

  return {
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    progress: state.progress,
    volume: state.volume,
    isShuffled: state.isShuffled,
    repeatMode: state.repeatMode,
    isMinimized: state.isMinimized,
    queue: state.queue,
    currentIndex: state.currentIndex,
    likedTracks: state.likedTracks,
    recentlyPlayed: state.recentlyPlayed,

    setQueue,
    playTrack,
    togglePlay,
    skipNext,
    skipPrevious,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    isLiked,
    toggleMinimize,
    closePlayer,
  };
};