"use client";

import { useEffect, useState } from "react";
import type { NowPlaying } from "../services/spotify";

const POLL_MS = 7_000;

export function NowPlayingBanner() {
  const [playing, setPlaying] = useState<NowPlaying>({ status: "unavailable" });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/spotify/now-playing");
        const value = response.ok ? await response.json() as NowPlaying : { status: "unavailable" } as const;
        if (active) setPlaying(value);
      } catch {
        if (active) setPlaying({ status: "unavailable" });
      }
    };
    void refresh();
    const interval = window.setInterval(refresh, POLL_MS);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  const content = playing.status === "playing"
    ? { label: "Now playing", title: playing.track.title, detail: `${playing.track.artists} · ${playing.track.album}`, art: playing.track.albumImageUrl }
    : playing.status === "idle"
      ? { label: "Spotify", title: "Between songs", detail: "Check back soon", art: null }
      : { label: "Spotify", title: "Listening status unavailable", detail: "Connection pending", art: null };

  const groups = [0, 1].map((group) => (
    <span className="now-playing-group" aria-hidden="true" key={group}>
      {[0, 1].map((copy) => (
        <span className="now-playing-segment" key={copy}>
          {/* Spotify artwork URLs are dynamic and cannot be predeclared for framework image optimization. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {content.art ? <img src={content.art} alt="" /> : <span className="now-playing-mark">♪</span>}
          <span className="now-playing-label"><i /><b>{content.label}</b></span>
          <strong>{content.title}</strong><span className="now-playing-dot">●</span><span>{content.detail}</span><span className="now-playing-arrow">↗</span>
        </span>
      ))}
    </span>
  ));

  const inner = <><span className="sr-only">{content.label}: {content.title}, {content.detail}</span><span className="now-playing-track">{groups}</span></>;
  return playing.status === "playing"
    ? <a className="now-playing-banner" href={playing.track.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`${content.label}: ${content.title} by ${playing.track.artists}. Open in Spotify.`}>{inner}</a>
    : <div className="now-playing-banner">{inner}</div>;
}
