import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiVolume2,
  FiVolumeX,
  FiShuffle,
  FiRepeat,
  FiHeart,
  FiMoreHorizontal,
  FiMinimize2,
  FiMaximize2
} from 'react-icons/fi';
import { ITrack } from '@/types';
import { getImageUrl, cn } from '@/utils';

interface MiniPlayerProps {
  currentTrack?: ITrack | null;
  isPlaying?: boolean;
  progress?: number;
  volume?: number;
  isShuffled?: boolean;
  repeatMode?: 'off' | 'one' | 'all';
  onTogglePlay?: () => void;
  onSkipPrevious?: () => void;
  onSkipNext?: () => void;
  onSeek?: (position: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  onToggleFavorite?: () => void;
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  queue?: ITrack[];
  currentIndex?: number;
  isLiked?: boolean;
  className?: string;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentTrack,
  isPlaying = false,
  progress = 0,
  volume = 80,
  isShuffled = false,
  repeatMode = 'off',
  onTogglePlay,
  onSkipPrevious,
  onSkipNext,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleFavorite,
  isMinimized = false,
  onToggleMinimize,
  queue = [],
  currentIndex = -1,
  isLiked = false,
  className,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localProgress, setLocalProgress] = useState(progress);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);

  const resolvedIndex =
    currentIndex >= 0
      ? currentIndex
      : queue.findIndex((t) => t.id === currentTrack?.id);
  const canSkipPrevious = queue.length > 1 && resolvedIndex > 0;
  const canSkipNext = queue.length > 1 && resolvedIndex < queue.length - 1;

  useEffect(() => {
    if (!isDragging) setLocalProgress(progress);
  }, [progress, isDragging]);

  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  if (!currentTrack) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVolumeClick = () => {
    if (isMuted || volume === 0) {
      setIsMuted(false);
      onVolumeChange?.(80);
    } else {
      setIsMuted(true);
      onVolumeChange?.(0);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setLocalProgress(percentage);
    onSeek?.(percentage);
  };

  const handleProgressTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setLocalProgress(percentage);
    onSeek?.(percentage);
  };

  const updateVolumeFromY = (clientY: number) => {
    if (!volumeRef.current) return;
    const rect = volumeRef.current.getBoundingClientRect();
    const clamped = Math.max(0, Math.min(100, Math.round(((rect.bottom - clientY) / rect.height) * 100)));
    setIsMuted(clamped === 0);
    onVolumeChange?.(clamped);
  };

  const duration = currentTrack.duration || 180000;
  const currentTime = (localProgress / 100) * duration / 1000;
  const totalTime = duration / 1000;

  // ── Minimized pill (mobile) ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className={cn(
        'fixed bottom-4 right-4 bg-white dark:bg-gray-900 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-2 z-50',
        className
      )}>
        <div className="flex items-center space-x-2">
          <img
            src={getImageUrl(currentTrack.poster_path)}
            alt={currentTrack.title || currentTrack.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <Button onClick={onTogglePlay} variant="ghost" size="icon"
            className="flex items-center justify-center w-8 h-8 bg-accent-orange hover:bg-accent-orange/90 text-white rounded-full">
            {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button onClick={onToggleMinimize} variant="ghost" size="icon"
            className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 dark:text-gray-500">
            <FiMaximize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Full player ──────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-40',
      'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl',
      'border-t border-gray-200 dark:border-gray-700',
      className
    )}>
      {/* Progress bar — full width, touch-friendly */}
      <div
        ref={progressRef}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 cursor-pointer group touch-none"
        onClick={handleProgressClick}
        onTouchMove={handleProgressTouch}
        onTouchStart={handleProgressTouch}
      >
        <div
          className="h-full bg-accent-orange rounded-full relative"
          style={{ width: `${localProgress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent-orange rounded-full opacity-0 group-hover:opacity-100 -mr-1.5" />
        </div>
      </div>

      {/* ── MOBILE layout (hidden on md+) ────────────────────────────────── */}
      <div className="md:hidden px-3 py-2">
        {/* Row 1 — album art + track info + heart + minimize */}
        <div className="flex items-center gap-3 mb-2">
          <div className="relative shrink-0">
            <img
              src={getImageUrl(currentTrack.poster_path)}
              alt={currentTrack.title || currentTrack.name}
              className="w-10 h-10 rounded-lg object-cover shadow"
            />
            {isPlaying && (
              <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                <div className="flex space-x-px">
                  <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <div className="w-0.5 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate leading-tight">
              {currentTrack.title || currentTrack.name || 'Unknown Track'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>

          {/* Heart */}
          <button
            onClick={() => onToggleFavorite?.()}
            className={cn(
              'p-2 rounded-full transition-colors shrink-0',
              isLiked ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
            )}
          >
            <FiHeart className={cn('w-4 h-4', isLiked && 'fill-current')} />
          </button>

          {/* Minimize */}
          <button
            onClick={onToggleMinimize}
            className="p-2 text-gray-400 dark:text-gray-500 shrink-0"
          >
            <FiMinimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2 — time left + controls + time right */}
        <div className="flex items-center justify-between gap-2">
          {/* Elapsed time */}
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-9 text-left shrink-0">
            {formatTime(currentTime)}
          </span>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleShuffle}
              className={cn(
                'p-2 rounded-full transition-colors',
                isShuffled ? 'text-accent-orange' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <FiShuffle className="w-4 h-4" />
            </button>

            <button
              onClick={canSkipPrevious ? onSkipPrevious : undefined}
              disabled={!canSkipPrevious}
              className={cn(
                'p-2 rounded-full transition-colors',
                canSkipPrevious ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600 opacity-40'
              )}
            >
              <FiSkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center shadow-md active:scale-95 transition-transform mx-1"
            >
              {isPlaying
                ? <FiPause className="w-5 h-5" />
                : <FiPlay className="w-5 h-5 ml-0.5" />}
            </button>

            <button
              onClick={canSkipNext ? onSkipNext : undefined}
              disabled={!canSkipNext}
              className={cn(
                'p-2 rounded-full transition-colors',
                canSkipNext ? 'text-gray-700 dark:text-gray-300' : 'text-gray-300 dark:text-gray-600 opacity-40'
              )}
            >
              <FiSkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleRepeat}
              className={cn(
                'p-2 rounded-full transition-colors relative',
                repeatMode !== 'off' ? 'text-accent-orange' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <FiRepeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-accent-orange text-white text-[8px] rounded-full flex items-center justify-center font-bold">1</span>
              )}
            </button>
          </div>

          {/* Total time */}
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono w-9 text-right shrink-0">
            {formatTime(totalTime)}
          </span>
        </div>
      </div>

      {/* ── DESKTOP layout (hidden below md) ─────────────────────────────── */}
      <div className="hidden md:flex items-center justify-between px-4 py-3">
        {/* Left — track info */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            <img
              src={getImageUrl(currentTrack.poster_path)}
              alt={currentTrack.title || currentTrack.name}
              className="w-12 h-12 rounded-lg object-cover shadow-md dark:brightness-75"
            />
            {isPlaying && (
              <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
                <div className="flex space-x-0.5">
                  <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" />
                  <div className="w-0.5 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                  <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {currentTrack.title || currentTrack.name || 'Unknown Track'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 truncate text-xs">
              {currentTrack.artist || 'Unknown Artist'}
            </p>
          </div>
          <Button onClick={() => onToggleFavorite?.()} variant="ghost" size="icon"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110',
              isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500 dark:text-gray-500'
            )}>
            <FiHeart className={cn('w-4 h-4', isLiked && 'fill-current')} />
          </Button>
        </div>

        {/* Centre — playback controls */}
        <div className="flex items-center space-x-4 px-8">
          <Button onClick={onToggleShuffle} variant="ghost" size="icon"
            className={cn('flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110',
              isShuffled ? 'text-accent-orange' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500')}>
            <FiShuffle className="w-4 h-4" />
          </Button>

          <Button onClick={canSkipPrevious ? onSkipPrevious : undefined} variant="ghost" size="icon"
            disabled={!canSkipPrevious}
            className={cn('flex items-center justify-center w-10 h-10 transition-all',
              canSkipPrevious ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:scale-110'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40')}>
            <FiSkipBack className="w-5 h-5" />
          </Button>

          <Button onClick={onTogglePlay} variant="ghost" size="icon"
            className="flex items-center justify-center w-12 h-12 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-lg transition-all hover:scale-105">
            {isPlaying ? <FiPause className="w-6 h-6" /> : <FiPlay className="w-6 h-6 ml-0.5" />}
          </Button>

          <Button onClick={canSkipNext ? onSkipNext : undefined} variant="ghost" size="icon"
            disabled={!canSkipNext}
            className={cn('flex items-center justify-center w-10 h-10 transition-all',
              canSkipNext ? 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:scale-110'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-40')}>
            <FiSkipForward className="w-5 h-5" />
          </Button>

          <Button onClick={onToggleRepeat} variant="ghost" size="icon"
            className={cn('flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 relative',
              repeatMode !== 'off' ? 'text-accent-orange' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500')}>
            <FiRepeat className="w-4 h-4" />
            {repeatMode === 'one' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-orange text-white text-xs rounded-full flex items-center justify-center font-bold">1</span>
            )}
          </Button>
        </div>

        {/* Right — time + volume + minimize */}
        <div className="flex items-center space-x-4 min-w-0 flex-1 justify-end">
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>

          <div className="relative"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}>
            <Button onClick={handleVolumeClick} variant="ghost" size="icon"
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:text-gray-500">
              {isMuted || volume === 0 ? <FiVolumeX className="w-4 h-4" /> : <FiVolume2 className="w-4 h-4" />}
            </Button>
            {showVolumeSlider && (
              <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                <div className="w-20 h-24 flex flex-col items-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{volume}%</div>
                  <div ref={volumeRef} onClick={(e) => updateVolumeFromY(e.clientY)}
                    className="flex-1 w-2 bg-gray-200 dark:bg-gray-600 rounded-full relative cursor-pointer">
                    <div className="w-full bg-accent-orange rounded-full absolute bottom-0" style={{ height: `${volume}%` }} />
                    <div className="absolute left-1/2 w-4 h-4 bg-accent-orange rounded-full -translate-x-1/2" style={{ bottom: `calc(${volume}% - 8px)` }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon"
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:text-gray-500">
            <FiMoreHorizontal className="w-4 h-4" />
          </Button>

          <Button onClick={onToggleMinimize} variant="ghost" size="icon"
            className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 dark:text-gray-500">
            <FiMinimize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
