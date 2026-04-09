import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper";
import { useRef } from "react";

import HeroSlide from "./HeroSlide";
import { ITrack } from "@/types";
import { getImageUrl } from "@/utils/helper";
import { useAudioPlayerContext } from "@/context/audioPlayerContext";

const Hero = ({ tracks }: { tracks: ITrack[] }) => {
  const swiperRef = useRef<any>(null);

  const { playTrack, currentTrack, isPlaying } = useAudioPlayerContext();

  return (
    <Swiper
      ref={swiperRef}
      className="mySwiper lg:h-screen sm:h-[640px] xs:h-[520px] h-[460px] w-full"
      loop={true}
      slidesPerView={1}
      autoplay={{
        delay: 10000,
        disableOnInteraction: false,
      }}
      modules={[Autoplay]}
    >
      {tracks.map((track) => {
        const activeTrackPlaying = currentTrack?.id === track.id && isPlaying;

        return (
          <SwiperSlide
            key={track.id}
            style={{
              backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0.5)), url('${getImageUrl(track.backdrop_path)}')`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
            className="h-full w-full will-change-transform motion-reduce:transform-none"
          >
            {({ isActive }) =>
              isActive ? (
                <HeroSlide
                  track={track}
                  onPlay={playTrack}
                  isPlaying={activeTrackPlaying}
                />
              ) : null
            }
          </SwiperSlide>
        );
      })}
    </Swiper>
  );
};

export default Hero;