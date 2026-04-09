import { FC } from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import { TrackCard } from "@/components/ui/TrackCard";
import { ITrack } from "@/types";
import { useAudioPlayerContext } from "@/context/audioPlayerContext";

interface MusicSlidesProps {
  tracks?: ITrack[];
  category: string;
  useModernCards?: boolean;
}

const MusicSlides: FC<MusicSlidesProps> = ({
  tracks = [],
  category,
  useModernCards: _useModernCards = true,
}) => {
  const { playTrack, currentTrack, isPlaying, setQueue } = useAudioPlayerContext();

  const safeTracks = Array.isArray(tracks) ? tracks : [];

  const handlePlay = async (track: ITrack) => {
    setQueue(safeTracks, track.id);
    await playTrack(track);
  };

  return (
    <Swiper slidesPerView="auto" spaceBetween={15} className="mySwiper">
      {safeTracks.map((track) => (
        <SwiperSlide
          key={track.id}
          className="flex mt-1 flex-col xs:gap-[14px] gap-2 max-w-[170px] rounded-lg"
        >
          <TrackCard
            track={track}
            category={category}
            isPlaying={currentTrack?.id === track.id && isPlaying}
            onPlay={handlePlay}
            variant="detailed"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default MusicSlides;