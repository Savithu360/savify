import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { useEffect, useMemo, useState } from "react";
import { ITrack } from "@/types";
import { getMockData, shouldUseMockData, getMockTrackById } from "@/data/mockMusicData";
import { performEnhancedSearch } from "@/utils/searchAlgorithm";
import { JAMENDO_API_BASE_URL, JAMENDO_CLIENT_ID } from "@/utils/config";

export const musicApi = createApi({
  reducerPath: "musicApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/" }),
  endpoints: () => ({}),
});
type QueryArgs = {
  category: string | undefined;
  type?: string;
  page?: number;
  searchQuery?: string;
  showSimilarTracks?: boolean;
  id?: number;
  cacheKey?: string;
};

type QueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
};

interface JamendoTrackResult {
  id: string | number;
  name: string;
  duration?: number; // seconds
  artist_name?: string;
  album_name?: string;
  image?: string;
  album_image?: string;
  audio?: string;
  releasedate?: string;
  musicinfo?: {
    tags?: {
      genres?: string[];
    };
  };
}

interface JamendoResponse {
  headers?: {
    status?: string;
    code?: number;
    error_message?: string;
    warnings?: string;
    results_count?: number;
  };
  results?: JamendoTrackResult[];
}

const emptyResult = {
  data: { results: [] as ITrack[] },
  isLoading: false,
  isFetching: false,
  isError: false,
  error: undefined,
} as QueryResult<{ results: ITrack[] }>;

const decodeHtml = (str: string): string =>
  str.replace(/&amp;/g, "&")
     .replace(/&lt;/g, "<")
     .replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"')
     .replace(/&#039;/g, "'");

const mapJamendoTrack = (track: JamendoTrackResult): ITrack => {
  const image = track.album_image || track.image || "";

  return {
    id: String(track.id),
    poster_path: image,
    backdrop_path: image,
    original_title: decodeHtml(track.name),
    name: decodeHtml(track.name),
    title: decodeHtml(track.name),
    overview: `${decodeHtml(track.artist_name || "Unknown Artist")} - ${decodeHtml(track.album_name || "Unknown Album")}`,
    artist: decodeHtml(track.artist_name || "Unknown Artist"),
    album: decodeHtml(track.album_name || "Unknown Album"),
    duration: (track.duration || 0) * 1000,
    preview_url: track.audio || null,
    genre: track.musicinfo?.tags?.genres?.[0],
    year: track.releasedate ? Number(track.releasedate.slice(0, 4)) : undefined,
  };
};

const buildBaseParams = (page = 1, limit = 20) => {
  if (!JAMENDO_CLIENT_ID) {
    throw new Error("Missing VITE_JAMENDO_CLIENT_ID in .env");
  }

  const params = new URLSearchParams({
    client_id: JAMENDO_CLIENT_ID,
    format: "json",
    limit: String(limit),
    offset: String((page - 1) * limit),
    imagesize: "300",
    audioformat: "mp32",
    include: "musicinfo",
    groupby: "artist_id",
  });

  return params;
};

const applySectionStrategy = (
  params: URLSearchParams,
  category?: string,
  type?: string
) => {
  const key = `${category || "tracks"}-${type || "popular"}`;

  switch (key) {
    case "tracks-latest":
      params.set("featured", "1");
      params.set("order", "releasedate_desc");
      break;

    case "tracks-popular":
      params.set("featured", "1");
      params.set("order", "popularity_total_desc");
      break;

    case "tracks-throwback":
      params.set("datebetween", "1990-01-01_2014-12-31");
      params.set("order", "popularity_total_desc");
      break;

    case "tracks-classic":
      params.set("datebetween", "1960-01-01_2009-12-31");
      params.set("order", "popularity_total_desc");
      break;

    case "tracks-rnb-classic":
      params.set("tags", "rnb+soul");
      params.set("datebetween", "1980-01-01_2015-12-31");
      params.set("order", "popularity_total_desc");
      break;

    case "tracks-chill":
      params.set("tags", "chill+relaxation");
      params.set("boost", "popularity_total");
      break;

    case "albums-new_releases":
      params.set("featured", "1");
      params.set("order", "releasedate_desc");
      break;

    case "albums-popular":
    case "albums-classic":
    case "albums-indie":
    default:
      params.set("featured", "1");
      params.set("order", "popularity_total_desc");
      break;
  }
};

const fetchJamendoTracks = async (params: URLSearchParams): Promise<{ results: ITrack[] }> => {
  const response = await fetch(`${JAMENDO_API_BASE_URL}/tracks/?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Jamendo request failed with ${response.status}`);
  }

  const json: JamendoResponse = await response.json();
  const results = (json.results || []).map(mapJamendoTrack);

  return { results };
};

const dedupeTracks = (tracks: ITrack[]) => {
  const seen = new Set<string>();

  return tracks.filter((track) => {
    const key = `${(track.name || "").toLowerCase()}-${(track.artist || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const useGetTracksQuery = (
  args: QueryArgs,
  options?: { skip?: boolean }
): QueryResult<{ results: ITrack[] }> => {
  const { category, type, page = 1, searchQuery, showSimilarTracks } = args;
  const skip = options?.skip ?? false;

  const [state, setState] = useState<QueryResult<{ results: ITrack[] }>>({
    data: undefined,
    isLoading: !skip,
    isFetching: !skip,
    isError: false,
    error: undefined,
  });

  const useMock = useMemo(() => shouldUseMockData(), []);

  useEffect(() => {
    if (skip) return;

    if (useMock && !searchQuery && !showSimilarTracks) {
      const mockData = getMockData(category || "tracks", type || "popular");
      setState({
        data: mockData,
        isLoading: false,
        isFetching: false,
        isError: false,
        error: undefined,
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: !prev.data,
        isFetching: true,
        isError: false,
        error: undefined,
      }));

      try {
        if (useMock && searchQuery) {
          const latestHits = getMockData("tracks", "latest");
          const popularTracks = getMockData("tracks", "popular");
          const allTracks = [...latestHits.results, ...popularTracks.results];
          const searchResults = performEnhancedSearch(allTracks, searchQuery).map(
            (result) => result.track
          );

          if (!cancelled) {
            setState({
              data: { results: searchResults },
              isLoading: false,
              isFetching: false,
              isError: false,
              error: undefined,
            });
          }
          return;
        }

        const params = buildBaseParams(page, 20);

        if (searchQuery) {
          params.set("search", searchQuery);
          params.set("boost", "popularity_total");
          params.delete("featured");
          params.delete("order");
        } else if (showSimilarTracks) {
          params.set("featured", "1");
          params.set("order", "popularity_total_desc");
          params.set("limit", "10");
        } else {
          applySectionStrategy(params, category, type);
        }

        const data = await fetchJamendoTracks(params);
        const deduped = { results: dedupeTracks(data.results) };

        if (!cancelled) {
          setState({
            data: deduped,
            isLoading: false,
            isFetching: false,
            isError: false,
            error: undefined,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: { results: [] },
            isLoading: false,
            isFetching: false,
            isError: true,
            error,
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [category, type, page, searchQuery, showSimilarTracks, skip, useMock]);

  return state;
};

export const useGetTrackQuery = (
  args: { category: string; id: number | string },
  options?: { skip?: boolean }
): QueryResult<ITrack> => {
  const { id } = args;
  const skip = options?.skip ?? false;

  const [state, setState] = useState<QueryResult<ITrack>>({
    data: undefined,
    isLoading: !skip,
    isFetching: !skip,
    isError: false,
    error: undefined,
  });

  const useMock = useMemo(() => shouldUseMockData(), []);

  useEffect(() => {
    if (skip) return;

    const stringId = String(id || "").trim();

    if (!stringId || stringId === "undefined" || stringId === "null") {
      setState({
        data: undefined,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: { status: 400, message: "Invalid ID provided" },
      });
      return;
    }

    if (useMock) {
      const mockTrack = getMockTrackById(stringId);

      setState({
        data: mockTrack,
        isLoading: false,
        isFetching: false,
        isError: !mockTrack,
        error: mockTrack ? undefined : { status: 404, message: "Track not found in mock data" },
      });

      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        const params = buildBaseParams(1, 1);
        params.set("id", stringId);

        const data = await fetchJamendoTracks(params);
        const track = data.results[0];

        if (!cancelled) {
          setState({
            data: track,
            isLoading: false,
            isFetching: false,
            isError: !track,
            error: track ? undefined : { status: 404, message: "Track not found" },
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            data: undefined,
            isLoading: false,
            isFetching: false,
            isError: true,
            error,
          });
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [id, skip, useMock]);

  return state;
};