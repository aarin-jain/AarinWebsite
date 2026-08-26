import assert from "node:assert/strict";
import test from "node:test";
import { getSpotifyNowPlaying } from "../services/spotify.ts";

const config = { clientId: "client", clientSecret: "secret", refreshToken: "refresh" };

test("exchanges the refresh token and maps the currently playing track", async () => {
  const requests = [];
  const fetcher = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.includes("/api/token")) return Response.json({ access_token: "access" });
    return Response.json({
      is_playing: true,
      currently_playing_type: "track",
      item: { name: "Kyoto", artists: [{ name: "Phoebe Bridgers" }], album: { name: "Punisher", images: [{ url: "https://image.test/art.jpg" }] }, external_urls: { spotify: "https://open.spotify.com/track/1" } },
    });
  };

  const result = await getSpotifyNowPlaying(config, fetcher);
  assert.equal(requests[0].init.headers.Authorization, `Basic ${btoa("client:secret")}`);
  assert.match(String(requests[0].init.body), /grant_type=refresh_token/);
  assert.equal(requests[1].init.headers.Authorization, "Bearer access");
  assert.deepEqual(result, { status: "playing", track: { title: "Kyoto", artists: "Phoebe Bridgers", album: "Punisher", albumImageUrl: "https://image.test/art.jpg", spotifyUrl: "https://open.spotify.com/track/1" } });
});

test("returns idle when Spotify has no active playback", async () => {
  const fetcher = async (url) => url.includes("/api/token") ? Response.json({ access_token: "access" }) : new Response(null, { status: 204 });
  assert.deepEqual(await getSpotifyNowPlaying(config, fetcher), { status: "idle" });
});

test("returns idle for paused tracks", async () => {
  const fetcher = async (url) => url.includes("/api/token") ? Response.json({ access_token: "access" }) : Response.json({ is_playing: false, currently_playing_type: "track", item: { name: "Paused" } });
  assert.deepEqual(await getSpotifyNowPlaying(config, fetcher), { status: "idle" });
});

test("fails clearly when Spotify rejects the refresh token", async () => {
  await assert.rejects(() => getSpotifyNowPlaying(config, async () => new Response("no", { status: 400 })), /token request failed \(400\)/);
});
