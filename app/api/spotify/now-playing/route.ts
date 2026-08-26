import { env } from "cloudflare:workers";
import { getSpotifyNowPlaying, type NowPlaying } from "../../../../services/spotify";

const CACHE_MS = 15_000;
let cached: { expiresAt: number; value: NowPlaying } | undefined;
let pending: Promise<NowPlaying> | undefined;

async function load(): Promise<NowPlaying> {
  const spotifyEnv = env as unknown as Record<string, string | undefined>;
  const clientId = spotifyEnv.SPOTIFY_CLIENT_ID;
  const clientSecret = spotifyEnv.SPOTIFY_CLIENT_SECRET;
  const refreshToken = spotifyEnv.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return { status: "unavailable" };

  try {
    return await getSpotifyNowPlaying({ clientId, clientSecret, refreshToken });
  } catch (error) {
    console.error("Unable to load Spotify playback state.", error);
    return { status: "unavailable" };
  }
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return response(cached.value);

  pending ??= load().finally(() => { pending = undefined; });
  const value = await pending;
  cached = { value, expiresAt: now + CACHE_MS };
  return response(value);
}

function response(value: NowPlaying) {
  return Response.json(value, { headers: { "Cache-Control": "public, max-age=10, stale-while-revalidate=20" } });
}
