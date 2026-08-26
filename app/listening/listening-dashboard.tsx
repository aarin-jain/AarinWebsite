"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SpotifyRange, SpotifyTopItems } from "../../services/spotify";

const ranges: Array<{ value: SpotifyRange; label: string }> = [
  { value: "short_term", label: "4 weeks" }, { value: "medium_term", label: "6 months" }, { value: "long_term", label: "Long term" },
];

export function ListeningDashboard() {
  const [range, setRange] = useState<SpotifyRange>("short_term");
  const [data, setData] = useState<SpotifyTopItems | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/spotify/top?range=${range}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<SpotifyTopItems>; })
      .then((value) => { setData(value); setState("ready"); })
      .catch((error) => { if (error.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [range]);

  return (
    <main className="listening-page">
      <nav className="nav shell" aria-label="Listening navigation">
        <Link className="brand" href="/" aria-label="Aarin Jain, home">AJ<span>.</span></Link>
        <div className="nav-links writing-nav"><Link href="/">Portfolio</Link><Link href="/writing">Writing</Link><Link href="/listening" aria-current="page">Listening</Link></div>
        <a className="availability" href="https://open.spotify.com/" target="_blank" rel="noreferrer"><i /> Open Spotify</a>
      </nav>
      <header className="listening-hero shell">
        <div><p className="eyebrow">On repeat · 再生中</p><h1>Music in<br />my <em>orbit.</em></h1></div>
        <div className="range-picker" aria-label="Listening period">
          <p>View my top five from</p>
          <div>{ranges.map((item) => <button key={item.value} className={range === item.value ? "active" : ""} onClick={() => { setState("loading"); setRange(item.value); }}>{item.label}</button>)}</div>
        </div>
      </header>
      <section className="listening-content shell" aria-live="polite">
        {state === "loading" ? <p className="listening-state">Tuning in…</p> : state === "error" ? <div className="listening-state"><strong>Listening data is taking a pause.</strong><span>The Spotify connection may need the top-items permission.</span></div> : data && <>
          <Ranking title="Top songs" japanese="曲" items={data.tracks} />
          <Ranking title="Top artists" japanese="音楽家" items={data.artists} />
        </>}
      </section>
      <footer className="shell"><Link className="brand" href="/">AJ<span>.</span></Link><p>Listening data from Spotify.</p><div><Link href="/">Portfolio</Link><a href="https://open.spotify.com/" target="_blank" rel="noreferrer">Spotify ↗</a></div></footer>
    </main>
  );
}

function Ranking({ title, japanese, items }: { title: string; japanese: string; items: SpotifyTopItems["tracks"] }) {
  return <section className="listening-ranking"><header><p className="eyebrow">{japanese}</p><h2>{title}</h2></header><div>{items.map((item, index) => <a className="listening-row" href={item.spotifyUrl} target="_blank" rel="noreferrer" key={item.id}>
    <span>{String(index + 1).padStart(2, "0")}</span>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="listening-art">♪</span>}
    <div><h3>{item.name}</h3><p>{item.detail}</p></div><b aria-hidden="true">↗</b>
  </a>)}</div></section>;
}
