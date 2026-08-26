export type NowPlaying =
  | { status: "playing"; track: { title: string; artists: string; album: string; albumImageUrl: string | null; spotifyUrl: string } }
  | { status: "idle" }
  | { status: "unavailable" };

export type SpotifyConfig = { clientId: string; clientSecret: string; refreshToken: string };
export const spotifyRanges = ["short_term", "medium_term", "long_term"] as const;
export type SpotifyRange = typeof spotifyRanges[number];
export type SpotifyTopItems = {
  tracks: Array<{ id: string; name: string; detail: string; imageUrl: string | null; spotifyUrl: string }>;
  artists: Array<{ id: string; name: string; detail: string; imageUrl: string | null; spotifyUrl: string }>;
};

type Fetcher = typeof fetch;

export async function getSpotifyNowPlaying(config: SpotifyConfig, fetcher: Fetcher = fetch): Promise<NowPlaying> {
  const accessToken = await getAccessToken(config, fetcher);
  const playbackResponse = await fetcher("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (playbackResponse.status === 204) return { status: "idle" };
  if (!playbackResponse.ok) throw new Error(`Spotify playback request failed (${playbackResponse.status}).`);

  const playback = await playbackResponse.json() as {
    is_playing?: boolean;
    currently_playing_type?: string;
    item?: {
      name?: string;
      artists?: Array<{ name?: string }>;
      album?: { name?: string; images?: Array<{ url?: string }> };
      external_urls?: { spotify?: string };
    } | null;
  };
  const item = playback.item;
  if (!playback.is_playing || playback.currently_playing_type !== "track" || !item?.name) return { status: "idle" };

  return {
    status: "playing",
    track: {
      title: item.name,
      artists: item.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist",
      album: item.album?.name || "Unknown album",
      albumImageUrl: item.album?.images?.[0]?.url || null,
      spotifyUrl: item.external_urls?.spotify || "https://open.spotify.com/",
    },
  };
}

export function isSpotifyRange(value: string | null): value is SpotifyRange {
  return spotifyRanges.includes(value as SpotifyRange);
}

export async function getSpotifyTopItems(config: SpotifyConfig, range: SpotifyRange, fetcher: Fetcher = fetch): Promise<SpotifyTopItems> {
  const accessToken = await getAccessToken(config, fetcher);
  const headers = { Authorization: `Bearer ${accessToken}` };
  const query = `time_range=${range}&limit=5`;
  const [tracksResponse, artistsResponse] = await Promise.all([
    fetcher(`https://api.spotify.com/v1/me/top/tracks?${query}`, { headers }),
    fetcher(`https://api.spotify.com/v1/me/top/artists?${query}`, { headers }),
  ]);
  if (!tracksResponse.ok || !artistsResponse.ok) throw new Error(`Spotify top-items request failed (${tracksResponse.status}/${artistsResponse.status}).`);

  const tracks = await tracksResponse.json() as { items?: Array<{ id?: string; name?: string; artists?: Array<{ name?: string }>; album?: { name?: string; images?: Array<{ url?: string }> }; external_urls?: { spotify?: string } }> };
  const artists = await artistsResponse.json() as { items?: Array<{ id?: string; name?: string; genres?: string[]; images?: Array<{ url?: string }>; external_urls?: { spotify?: string } }> };
  return {
    tracks: (tracks.items || []).filter((item) => item.id && item.name).map((item) => ({
      id: item.id!, name: item.name!, detail: item.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || item.album?.name || "Spotify track",
      imageUrl: item.album?.images?.[0]?.url || null, spotifyUrl: item.external_urls?.spotify || "https://open.spotify.com/",
    })),
    artists: (artists.items || []).filter((item) => item.id && item.name).map((item) => ({
      id: item.id!, name: item.name!, detail: item.genres?.slice(0, 2).join(" · ") || "Artist",
      imageUrl: item.images?.[0]?.url || null, spotifyUrl: item.external_urls?.spotify || "https://open.spotify.com/",
    })),
  };
}

async function getAccessToken(config: SpotifyConfig, fetcher: Fetcher) {
  const tokenResponse = await fetcher("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: config.refreshToken }),
  });

  if (!tokenResponse.ok) throw new Error(`Spotify token request failed (${tokenResponse.status}).`);
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error("Spotify did not return an access token.");
  return token.access_token;
}
