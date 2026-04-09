import { memo } from "react";
import { m } from "framer-motion";
import { FaPlay, FaPause } from "react-icons/fa";

import { Poster } from "@/common";
import { mainHeading, maxWidth, paragraph, watchBtn } from "@/styles";
import { ITrack } from "@/types";
import { cn } from "@/utils/helper";
import { useMotion } from "@/hooks/useMotion";

interface HeroSlideProps {
  track: ITrack;
  onPlay?: (track: ITrack) => void;
  isPlaying?: boolean;
}

const HeroSlide = ({ track, onPlay, isPlaying = false }: HeroSlideProps) => {
  const { fadeDown, staggerContainer } = useMotion();

  const {
    overview,
    original_title: title,
    name,
    poster_path: posterPath,
    artist,
  } = track;

  const displayTitle = title || name || "Unknown Track";
  const displayOverview =
    overview?.length > 180 ? `${overview.substring(0, 180)}...` : overview || artist || "No description available.";

  return (
    <div
      className={cn(
        maxWidth,
        "mx-auto flex items-center h-full flex-row lg:gap-32 sm:gap-20"
      )}
    >
      <m.div
        variants={staggerContainer(0.2, 0.3)}
        initial="hidden"
        animate="show"
        className="text-gray-300 sm:max-w-[80vw] max-w-[90vw] md:max-w-[420px] font-nunito flex flex-col sm:gap-5 xs:gap-3 gap-[10px] sm:mb-8"
      >
        <m.h2 variants={fadeDown} className={cn(mainHeading)}>
          {displayTitle}
        </m.h2>

        <m.p variants={fadeDown} className={paragraph}>
          {displayOverview}
        </m.p>

        <m.div variants={fadeDown}>
          <button
            type="button"
            onClick={() => onPlay?.(track)}
            className={cn(
              watchBtn,
              "inline-flex items-center gap-3 rounded-full px-6 py-3 font-semibold transition-all duration-200 hover:scale-105"
            )}
          >
            {isPlaying ? <FaPause className="text-sm" /> : <FaPlay className="text-sm ml-0.5" />}
            {isPlaying ? "Pause" : "Play Now"}
          </button>
        </m.div>
      </m.div>

      <Poster title={displayTitle} posterPath={posterPath} className="mr-auto" />
    </div>
  );
};

export default memo(HeroSlide);