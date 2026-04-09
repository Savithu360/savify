import { useState, useEffect, useRef, useCallback } from "react";
import { FiSearch, FiX, FiMusic } from "react-icons/fi";
import { m, AnimatePresence } from "framer-motion";

import { TrackCard } from "@/components/ui/TrackCard";
import { SkelatonLoader } from "@/common/Loader";
import { useGetTracksQuery } from "@/services/MusicAPI";
import { useAudioPlayerContext } from "@/context/audioPlayerContext";
import { maxWidth } from "@/styles";
import { cn } from "@/utils/helper";
import { ITrack } from "@/types";

// Genre / mood browsing categories — each maps to a Jamendo search query
const BROWSE_CATEGORIES = [
  { label: "Pop",        query: "pop",          color: "from-pink-500 to-rose-500",      emoji: "🎵" },
  { label: "Rock",       query: "rock",          color: "from-red-600 to-orange-500",     emoji: "🎸" },
  { label: "Hip-Hop",    query: "hip hop",       color: "from-yellow-500 to-amber-400",   emoji: "🎤" },
  { label: "Electronic", query: "electronic",    color: "from-cyan-500 to-blue-500",      emoji: "🎧" },
  { label: "Jazz",       query: "jazz",          color: "from-purple-600 to-violet-500",  emoji: "🎷" },
  { label: "Classical",  query: "classical",     color: "from-emerald-600 to-teal-500",   emoji: "🎻" },
  { label: "Chill",      query: "chill",         color: "from-sky-400 to-indigo-400",     emoji: "😌" },
  { label: "Acoustic",   query: "acoustic",      color: "from-lime-500 to-green-600",     emoji: "🪕" },
  { label: "Soul & R&B", query: "soul rnb",      color: "from-orange-500 to-red-400",     emoji: "🎼" },
  { label: "Ambient",    query: "ambient",       color: "from-slate-500 to-gray-600",     emoji: "🌙" },
];

// --- Sub-components ---

const EmptyState = ({ query }: { query: string }) => (
  <m.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-24 text-center"
  >
    <div className="text-6xl mb-4">🔍</div>
    <h3 className="text-xl font-semibold dark:text-gray-100 text-gray-800 mb-2">
      No results for "{query}"
    </h3>
    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
      Try different keywords, an artist name, or browse a genre below.
    </p>
  </m.div>
);

const BrowseGrid = ({ onCategoryClick }: { onCategoryClick: (query: string, label: string) => void }) => (
  <m.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ staggerChildren: 0.04 }}
  >
    <h2 className="text-xl font-bold dark:text-gray-100 text-gray-800 mb-5">
      Browse by genre
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {BROWSE_CATEGORIES.map((cat, i) => (
        <m.button
          key={cat.label}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onCategoryClick(cat.query, cat.label)}
          className={cn(
            "relative overflow-hidden rounded-xl p-4 h-24 text-left",
            "bg-gradient-to-br text-white font-semibold shadow-md",
            "transition-shadow duration-200 hover:shadow-lg",
            cat.color
          )}
        >
          <span className="text-2xl absolute bottom-2 right-3 opacity-80">
            {cat.emoji}
          </span>
          <span className="text-sm font-bold tracking-wide">{cat.label}</span>
        </m.button>
      ))}
    </div>
  </m.div>
);

// Results section with its own data-fetching
const SearchResults = ({
  query,
  onResults,
}: {
  query: string;
  onResults: (tracks: ITrack[]) => void;
}) => {
  const { playTrack, currentTrack, isPlaying, setQueue } = useAudioPlayerContext();
  const { data, isLoading, isError } = useGetTracksQuery(
    { category: "tracks", searchQuery: query },
    { skip: !query.trim() }
  );

  const tracks = data?.results ?? [];

  useEffect(() => {
    onResults(tracks);
  }, [tracks, onResults]);

  const handlePlay = (track: ITrack) => {
    setQueue(tracks, track.id);
    playTrack(track);
  };

  if (isLoading) {
    return (
      <div className="mt-6">
        <SkelatonLoader />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-10 text-center text-red-400">
        Something went wrong. Please try again.
      </div>
    );
  }

  if (!tracks.length) {
    return <EmptyState query={query} />;
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        {tracks.length} result{tracks.length !== 1 ? "s" : ""} for{" "}
        <span className="font-semibold dark:text-gray-200 text-gray-700">
          "{query}"
        </span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            category="tracks"
            isPlaying={currentTrack?.id === track.id && isPlaying}
            onPlay={handlePlay}
            variant="detailed"
          />
        ))}
      </div>
    </m.div>
  );
};

// --- Main Search Page ---

const Search = () => {
  const [inputValue, setInputValue] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [resultCount, setResultCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce: commit the query 400ms after the user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!inputValue.trim()) {
      setCommittedQuery("");
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setCommittedQuery(inputValue.trim());
    }, 400);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [inputValue]);

  const handleClear = () => {
    setInputValue("");
    setCommittedQuery("");
    inputRef.current?.focus();
  };

  const handleCategoryClick = (query: string, _label: string) => {
    setInputValue(query);
    setCommittedQuery(query);
    inputRef.current?.focus();
  };

  const handleResults = useCallback((tracks: ITrack[]) => {
    setResultCount(tracks.length);
  }, []);

  const showBrowse = !committedQuery;

  return (
    <div
      className={cn(
        maxWidth,
        "pt-28 pb-32 min-h-screen font-nunito"
      )}
    >
      {/* Page heading */}
      <m.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-extrabold dark:text-white text-gray-900 mb-1">
          Search
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Find songs, artists, and genres from the Jamendo library.
        </p>
      </m.div>

      {/* Search input */}
      <div className="relative mb-10 max-w-2xl">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="What do you want to listen to?"
          className={cn(
            "w-full pl-12 pr-12 py-4 rounded-2xl text-base font-medium",
            "bg-white dark:bg-card-dark",
            "border border-gray-200 dark:border-gray-700",
            "text-gray-900 dark:text-gray-100",
            "placeholder-gray-400 dark:placeholder-gray-500",
            "shadow-sm focus:shadow-md",
            "focus:outline-none focus:ring-2 focus:ring-accent-orange/50",
            "transition-all duration-200"
          )}
        />
        <AnimatePresence>
          {inputValue && (
            <m.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <FiX className="w-5 h-5" />
            </m.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results or Browse */}
      <AnimatePresence mode="wait">
        {showBrowse ? (
          <m.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <BrowseGrid onCategoryClick={handleCategoryClick} />
          </m.div>
        ) : (
          <m.div
            key={committedQuery}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SearchResults
              query={committedQuery}
              onResults={handleResults}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Search;
