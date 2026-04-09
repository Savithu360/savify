import React, { useEffect, useRef } from 'react';

import {
  FiSearch,
  FiMusic,
  FiDisc,
  FiUser,
  FiClock,
  FiX,
  FiPlay,
  FiSettings,
  FiHelpCircle,
  FiNavigation,
  FiTrash2
} from 'react-icons/fi';
import { cn } from '@/utils/helper';
import { useCommandPalette, SearchResult } from '@/hooks/useCommandPalette';

interface CommandPaletteProps {
  isOpen?: boolean;
  onClose?: () => void;
  onItemSelect?: (item: SearchResult) => void;
  className?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen = false,
  onClose,
  onItemSelect,
  className
}) => {
  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    allResults,
    exactMatches,
    recommendations,
    recentItems,
    isLoading,
    error,
    handleItemSelect,
    clearHistory
  } = useCommandPalette({ onItemSelect, onClose });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults, setSelectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (allResults[selectedIndex]) {
            handleItemSelect(allResults[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allResults, selectedIndex, handleItemSelect, onClose, setSelectedIndex]);

  const getItemIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'track': return FiMusic;
      case 'album': return FiDisc;
      case 'artist': return FiUser;
      case 'playlist': return FiMusic;
      case 'command': return FiSearch;
      default: return FiMusic;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation': return FiNavigation;
      case 'player': return FiPlay;
      case 'settings': return FiSettings;
      case 'help': return FiHelpCircle;
      default: return FiSearch;
    }
  };

  const getItemTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'track': return 'Track';
      case 'album': return 'Album';
      case 'artist': return 'Artist';
      case 'playlist': return 'Playlist';
      case 'command': return 'Command';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20",
      className
    )}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border w-full max-w-2xl mx-4 max-h-96 flex flex-col overflow-hidden">

        {/* Search Input */}
        <div className="flex items-center px-4 py-4 border-b">
          <FiSearch className="w-5 h-5 text-gray-400 mr-3" />

          <input
            ref={inputRef}
            type="text"
            placeholder="Search music and artists..."
            className="flex-1 bg-transparent outline-none text-lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex items-center ml-2">
            {query && (
              <button onClick={() => setQuery('')}>
                <FiX />
              </button>
            )}

            <button onClick={onClose} className="ml-2">
              <kbd>ESC</kbd>
            </button>
          </div>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto">
  <>
    {isLoading && (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Searching...</span>
      </div>
    )}

    {error && (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-red-600 dark:text-red-400 text-center">
          Search failed. Please try again.
        </p>
      </div>
    )}

    {!query && (
      <div className="p-4">
        {/* keep your existing recentItems / quick access code here */}
      </div>
    )}

    {query && !isLoading && allResults.length > 0 && (
      <div className="py-2">
        {/* keep your exactMatches + recommendations code */}
      </div>
    )}

    {query && !isLoading && allResults.length === 0 && !error && (
      <div className="flex flex-col items-center justify-center py-12">
        <FiSearch className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No results found for "<span className="font-medium">{query}</span>"
        </p>
      </div>
    )}
  </>
</div>

        {/* Footer */}
        <div className="p-3 border-t text-xs text-gray-500">
          Use ↑↓ to navigate, Enter to select
        </div>

      </div>
    </div>
  );
};