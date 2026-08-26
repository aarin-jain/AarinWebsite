import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSpotifyTopItems, isSpotifyRange } from "../services/spotify.ts";

const config = { clientId: "client", clientSecret: "secret", refreshToken: "refresh" };

test("accepts only Spotify's supported top-item ranges", () => {
  for (const range of ["short_term", "medium_term", "long_term"]) assert.equal(isSpotifyRange(range), true);
  for (const range of ["week", "90_days", "", null]) assert.equal(isSpotifyRange(range), false);
});

test("loads and maps five top tracks and artists using one refreshed token", async () => {
  const urls = [];
  const fetcher = async (url) => {
    urls.push(url);
    if (url.includes("/api/token")) return Response.json({ access_token: "access" });
    if (url.includes("/top/tracks")) return Response.json({ items: [{ id: "t1", name: "Track", artists: [{ name: "Artist" }], album: { images: [{ url: "track.jpg" }] }, external_urls: { spotify: "track-url" } }] });
    return Response.json({ items: [{ id: "a1", name: "Artist", genres: ["indie", "rock"], images: [{ url: "artist.jpg" }], external_urls: { spotify: "artist-url" } }] });
  };
  const result = await getSpotifyTopItems(config, "short_term", fetcher);
  assert.equal(urls.filter((url) => url.includes("/api/token")).length, 1);
  assert.match(urls[1], /time_range=short_term&limit=5/);
  assert.deepEqual(result.tracks[0], { id: "t1", name: "Track", detail: "Artist", imageUrl: "track.jpg", spotifyUrl: "track-url" });
  assert.deepEqual(result.artists[0], { id: "a1", name: "Artist", detail: "indie · rock", imageUrl: "artist.jpg", spotifyUrl: "artist-url" });
});

test("uses document links for reliable listening-page navigation on Vinext", () => {
  const source = readFileSync(new URL("../app/listening/listening-dashboard.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from ["']next\/link["']/);
  assert.match(source, /<a className="brand" href="\/"/);
  assert.match(source, /<a href="\/writing">Writing<\/a>/);
});
