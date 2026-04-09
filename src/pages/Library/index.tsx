import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { FiHeart, FiClock, FiTrash2 } from "react-icons/fi";

import { TrackCard } from "@/components/ui/TrackCard";
import { useAudioPlayerContext } from "@/context/audioPlayerContext";
import { maxWidth } from "@/styles";
import { cn } from "@/utils/helper";
import { ITrack } from "@/types";

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "liked" | "recent";

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ tab }: { tab: Tab }) => {
  const isLiked = tab === "liked";

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-28 text-center"
    >
      <div className="text-6xl mb-5">
        {isLiked ? "💔" : "🎵"}
      </div>
      <h3 className="text-xl font-semibold dark:text-gray-100 text-gray-800 mb-2">
        {isLiked ? "No liked songs yet" : "Nothing played yet"}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        {isLiked
          ? "Hit the heart icon on any track while it's playing to save it here."
          : "Start playing tracks from the home page or search — they'll appear here."}
      </p>
    </m.div>
  );
};

// ─── Track list row (used for Recently Played) ────────────────────────────────

const TrackRow = ({
  track,
  index,
  isPlaying,
  onPlay,
  onRemove,
  showRemove,
}: {
  track: ITrack;
  index: number;
  isPlaying: boolean;
  onPlay: (track: ITrack) => void;
  onRemove?: (track: ITrack) => void;
  showRemove?: boolean;
}) => {
  const formatDuration = (ms?: number) => {
    if (!ms) return "";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <m.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onPlay(track)}
      className={cn(
        "group flex items-center gap-4 px-3 py-2.5 rounded-xl cursor-pointer",
        "transition-colors duration-150",
        "hover:bg-gray-100 dark:hover:bg-hover-gray",
        isPlaying && "bg-gray-100 dark:bg-hover-gray"
      )}
    >
      {/* Index / playing indicator */}
      <div className="w-6 text-center shrink-0">
        {isPlaying ? (
          <div className="flex items-end justify-center gap-px h-4">
            <div className="w-0.5 bg-accent-orange rounded-full animate-bounce h-3" style={{ animationDelay: "0ms" }} />
            <div className="w-0.5 bg-accent-orange rounded-full animate-bounce h-4" style={{ animationDelay: "150ms" }} />
            <div className="w-0.5 bg-accent-orange rounded-full animate-bounce h-2" style={{ animationDelay: "300ms" }} />
          </div>
        ) : (
          <span className="text-xs text-gray-400 dark:text-gray-500 group-hover:hidden">
            {index + 1}
          </span>
        )}
      </div>

      {/* Album art */}
      <img
        src={track.poster_path}
        alt={track.title || track.name}
        className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm"
        loading="lazy"
      />

      {/* Title + artist */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-semibold truncate",
          isPlaying
            ? "text-accent-orange"
            : "text-gray-900 dark:text-gray-100"
        )}>
          {track.title || track.name || "Unknown Track"}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {track.artist || "Unknown Artist"}
          {track.album ? ` · ${track.album}` : ""}
        </p>
      </div>

      {/* Duration */}
      {track.duration && (
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 tabular-nums">
          {formatDuration(track.duration)}
        </span>
      )}

      {/* Remove button */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(track); }}
          className={cn(
            "shrink-0 p-1.5 rounded-lg transition-all duration-150",
            "opacity-0 group-hover:opacity-100",
            "text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400",
            "hover:bg-red-50 dark:hover:bg-red-900/20"
          )}
          aria-label="Remove from list"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </m.div>
  );
};

// ─── Main Library Page ────────────────────────────────────────────────────────

const Library = () => {
  const [activeTab, setActiveTab] = useState<Tab>("liked");

  const {
    likedTracks,
    recentlyPlayed,
    currentTrack,
    isPlaying,
    playTrack,
    setQueue,
    toggleFavorite,
  } = useAudioPlayerContext();

  const handlePlay = (track: ITrack, list: ITrack[]) => {
    setQueue(list, track.id);
    playTrack(track);
  };

  const handleUnlike = (track: ITrack) => {
    toggleFavorite(track);
  };

  const handleRemoveRecent = (trackToRemove: ITrack) => {
    // Recently played is managed in the hook — we expose a clear fn
    // For individual removal we call clearRecentTrack if available,
    // otherwise this is a no-op (full clear is in the hook)
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: "liked",
      label: "Liked Songs",
      icon: <FiHeart className="w-4 h-4" />,
      count: likedTracks.length,
    },
    {
      id: "recent",
      label: "Recently Played",
      icon: <FiClock className="w-4 h-4" />,
      count: recentlyPlayed.length,
    },
  ];

  const currentList = activeTab === "liked" ? likedTracks : recentlyPlayed;
  const isEmpty = currentList.length === 0;

  return (
    <div className={cn(maxWidth, "pt-28 pb-32 min-h-screen font-nunito")}>

      {/* Page heading */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-extrabold dark:text-white text-gray-900 mb-1">
          Your Library
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your liked songs and listening history.
        </p>
      </m.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold",
              "transition-all duration-200",
              activeTab === tab.id
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md"
                : "bg-gray-100 dark:bg-card-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-hover-gray"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-bold",
                activeTab === tab.id
                  ? "bg-white/20 dark:bg-black/20 text-white dark:text-gray-900"
                  : "bg-gray-200 dark:bg-hover-gray text-gray-500 dark:text-gray-400"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <m.div
            key={`empty-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmptyState tab={activeTab} />
          </m.div>
        ) : activeTab === "liked" ? (

          /* ── Liked Songs — card grid ── */
          <m.div
            key="liked"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {likedTracks.length} song{likedTracks.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => {
                  setQueue(likedTracks, likedTracks[0]?.id);
                  playTrack(likedTracks[0]);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-accent-orange hover:bg-accent-orange/90 text-white text-sm font-semibold rounded-full transition-all duration-200 hover:scale-105 shadow-sm"
              >
                Play All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {likedTracks.map((track) => (
                <div key={track.id} className="relative group/card">
                  <TrackCard
                    track={track}
                    category="tracks"
                    isPlaying={currentTrack?.id === track.id && isPlaying}
                    onPlay={(t) => handlePlay(t, likedTracks)}
                    variant="detailed"
                  />
                  {/* Unlike button overlay */}
                  <button
                    onClick={() => handleUnlike(track)}
                    className={cn(
                      "absolute top-2 right-2 z-10 p-1.5 rounded-full",
                      "bg-black/60 hover:bg-red-500 text-white",
                      "opacity-0 group-hover/card:opacity-100",
                      "transition-all duration-200"
                    )}
                    aria-label="Remove from liked"
                    title="Remove from Liked Songs"
                  >
                    <FiHeart className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </m.div>

        ) : (

          /* ── Recently Played — list view ── */
          <m.div
            key="recent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {recentlyPlayed.length} track{recentlyPlayed.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-4 px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <span className="w-6 text-center">#</span>
              <span className="w-10 shrink-0" />
              <span className="flex-1">Title</span>
              <span className="w-12 text-right">Time</span>
              <span className="w-8" />
            </div>

            <div className="flex flex-col">
              {recentlyPlayed.map((track, i) => (
                <TrackRow
                  key={`${track.id}-${i}`}
                  track={track}
                  index={i}
                  isPlaying={currentTrack?.id === track.id && isPlaying}
                  onPlay={(t) => handlePlay(t, recentlyPlayed)}
                  showRemove={false}
                />
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Library;
