import { ITrack } from "@/types";
import { JAMENDO_API_BASE_URL, JAMENDO_CLIENT_ID } from "@/utils/config";

export interface PreviewTrack extends ITrack {
  preview_url?: string | null;
  spotify_id?: string;
}

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

const decodeHtml = (str: string): string =>
  str.replace(/&amp;/g, "&")
     .replace(/&lt;/g, "<")
     .replace(/&gt;/g, ">")
     .replace(/&quot;/g, '"')
     .replace(/&#039;/g, "'");

const mapJamendoTrackToAppTrack = (track: JamendoTrackResult): PreviewTrack => {
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

export class MCPAudioService {
  private retryAttempts = 3;
  private retryDelay = 1000;

  private ensureClientId() {
    if (!JAMENDO_CLIENT_ID) {
      throw new Error("Missing VITE_JAMENDO_CLIENT_ID in .env");
    }
  }

  private async makeRequest(params: URLSearchParams, attempt = 1): Promise<any> {
    this.ensureClientId();

    const url = `${JAMENDO_API_BASE_URL}/tracks/?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
          return this.makeRequest(params, attempt + 1);
        }
        throw new Error(`Jamendo request failed with ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (attempt < this.retryAttempts) {
        await this.delay(this.retryDelay * attempt);
        return this.makeRequest(params, attempt + 1);
      }
      throw error;
    }
  }

  async fetchTrackWithPreview(trackId: string): Promise<PreviewTrack | null> {
    try {
      const params = new URLSearchParams({
        client_id: JAMENDO_CLIENT_ID,
        format: "json",
        id: trackId,
        include: "musicinfo",
        imagesize: "300",
        audioformat: "mp32",
      });

      const data = await this.makeRequest(params);
      const result = data?.results?.[0];

      if (!result) return null;

      return mapJamendoTrackToAppTrack(result);
    } catch (error) {
      console.error("❌ Jamendo fetchTrackWithPreview error:", error);
      return null;
    }
  }

  async searchTracksWithPreviews(query: string, limit = 10): Promise<PreviewTrack[]> {
    try {
      const params = new URLSearchParams({
        client_id: JAMENDO_CLIENT_ID,
        format: "json",
        search: query,
        limit: String(limit),
        groupby: "artist_id",
        boost: "popularity_total",
        include: "musicinfo",
        imagesize: "300",
        audioformat: "mp32",
      });

      const data = await this.makeRequest(params);
      const results: JamendoTrackResult[] = data?.results || [];

      return results
        .map(mapJamendoTrackToAppTrack)
        .filter((track) => !!track.preview_url);
    } catch (error) {
      console.error("❌ Jamendo searchTracksWithPreviews error:", error);
      return [];
    }
  }

  async enhanceTrackWithPreview(track: ITrack): Promise<PreviewTrack> {
    if (track.preview_url) {
      return track as PreviewTrack;
    }

    const query = `${track.name || track.original_title} ${track.artist || ""}`.trim();
    const results = await this.searchTracksWithPreviews(query, 5);

    const exactish = results.find((result) => {
      const sameTitle =
        (result.name || "").toLowerCase() === (track.name || track.original_title || "").toLowerCase();

      const sameArtist =
        !track.artist ||
        (result.artist || "").toLowerCase().includes((track.artist || "").toLowerCase());

      return sameTitle && sameArtist;
    });

    return exactish || results[0] || { ...track, preview_url: null };
  }

  async isServiceAvailable(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        client_id: JAMENDO_CLIENT_ID,
        format: "json",
        limit: "1",
      });

      const response = await fetch(`${JAMENDO_API_BASE_URL}/tracks/?${params.toString()}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const mcpAudioService = new MCPAudioService();