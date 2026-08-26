import { env } from "cloudflare:workers";
import { getSpotifyTopItems, isSpotifyRange, type SpotifyRange, type SpotifyTopItems } from "../../../../services/spotify";

const CACHE_MS = 15 * 60_000;
const cache = new Map<SpotifyRange, { expiresAt: number; value: SpotifyTopItems }>();

export async function GET(request: Request) {
  const rangeValue = new URL(request.url).searchParams.get("range");
  if (!isSpotifyRange(rangeValue)) return Response.json({ error: "Invalid Spotify time range." }, { status: 400 });
  const existing = cache.get(rangeValue);
  if (existing && existing.expiresAt > Date.now()) return Response.json(existing.value);

  const values = env as unknown as Record<string, string | undefined>;
  const clientId = values.SPOTIFY_CLIENT_ID;
  const clientSecret = values.SPOTIFY_CLIENT_SECRET;
  const refreshToken = values.SPOTIFY_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return Response.json({ error: "Spotify is not configured." }, { status: 503 });

  try {
    const value = await getSpotifyTopItems({ clientId, clientSecret, refreshToken }, rangeValue);
    cache.set(rangeValue, { value, expiresAt: Date.now() + CACHE_MS });
    return Response.json(value, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=900" } });
  } catch (error) {
    console.error("Unable to load Spotify top items.", error);
    return Response.json({ error: "Spotify listening data is unavailable." }, { status: 503 });
  }
}
