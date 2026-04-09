import React, { createContext, useContext, ReactNode } from "react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

type AudioPlayerContextType = ReturnType<typeof useAudioPlayer>;

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

interface AudioPlayerProviderProps {
  children: ReactNode;
}

export const AudioPlayerProvider: React.FC<AudioPlayerProviderProps> = ({ children }) => {
  const audioPlayer = useAudioPlayer();

  return (
    <AudioPlayerContext.Provider value={audioPlayer}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayerContext = () => {
  const context = useContext(AudioPlayerContext);

  if (!context) {
    throw new Error("useAudioPlayerContext must be used within AudioPlayerProvider");
  }

  return context;
};