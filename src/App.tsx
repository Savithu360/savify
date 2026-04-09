import { lazy, Suspense, useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import {
  Header,
  Footer,
  SideBar,
  ScrollToTop,
  Loader,
  ErrorBoundary,
  DemoModeBadge,
} from "@/common";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { MiniPlayer } from "@/components/ui/MiniPlayer";
import { useAudioPlayerContext } from "@/context/audioPlayerContext";

import "react-loading-skeleton/dist/skeleton.css";
import "swiper/css";

const Home = lazy(() => import("./pages/Home"));
const Search = lazy(() => import("./pages/Search"));
const Library = lazy(() => import("./pages/Library"));
const NotFound = lazy(() => import("./pages/NotFound"));

const App = () => {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const {
    currentTrack,
    isPlaying,
    progress,
    volume,
    isShuffled,
    repeatMode,
    isMinimized,
    queue,
    currentIndex,
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
  } = useAudioPlayerContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <SideBar />
      <Header onOpenSearch={() => setIsCommandPaletteOpen(true)} />
      <DemoModeBadge />

      <main className="transition-all duration-300 lg:pb-14 md:pb-4 sm:pb-2 xs:pb-1 pb-24 bg-white dark:bg-deep-dark min-h-screen">
        <ScrollToTop>
          <ErrorBoundary>
            <Suspense fallback={<Loader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/library" element={<Library />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </ScrollToTop>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onItemSelect={() => {
          // Item selection handled by CommandPalette component
        }}
      />

      <MiniPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        volume={volume}
        isShuffled={isShuffled}
        repeatMode={repeatMode}
        queue={queue}
        currentIndex={currentIndex}
        onTogglePlay={togglePlay}
        onSkipPrevious={skipPrevious}
        onSkipNext={skipNext}
        onSeek={seek}
        onVolumeChange={setVolume}
        onToggleShuffle={toggleShuffle}
        onToggleRepeat={toggleRepeat}
        onToggleFavorite={toggleFavorite}
        isLiked={currentTrack ? isLiked(currentTrack.id) : false}
        isMinimized={isMinimized}
        onToggleMinimize={toggleMinimize}
      />

      <Footer />
    </>
  );
};

export default App;