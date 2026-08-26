export type NowPlaying =
  | { status: "playing"; track: { title: string; artists: string; album: string; albumImageUrl: string | null; spotifyUrl: string } }
  | { status: "idle" }
  | { status: "unavailable" };

export type SpotifyConfig = { clientId: string; clientSecret: string; refreshToken: string };

type Fetcher = typeof fetch;

export async function getSpotifyNowPlaying(config: SpotifyConfig, fetcher: Fetcher = fetch): Promise<NowPlaying> {
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

  const playbackResponse = await fetcher("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token.access_token}` },
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
