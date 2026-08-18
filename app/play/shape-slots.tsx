"use client";

import { useState } from "react";

const symbols = ["circle", "triangle", "square"];

export function ShapeSlots() {
  const [reels, setReels] = useState(["circle", "triangle", "square"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState("Match three shapes to remix the palette.");
  const [wins, setWins] = useState(0);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    setMessage("Finding a new frequency…");
    const shuffle = window.setInterval(() => {
      setReels((current) => current.map(() => randomSymbol()));
    }, 85);

    window.setTimeout(() => {
      window.clearInterval(shuffle);
      const result = [randomSymbol(), randomSymbol(), randomSymbol()];
      setReels(result);
      setSpinning(false);
      if (result.every((symbol) => symbol === result[0])) {
        applyPalette(result[0]);
        setWins((count) => count + 1);
        setMessage(`Three ${result[0]}s. The page has a new color rhythm.`);
      } else {
        setMessage("No match. Give the geometry another spin.");
      }
    }, 900);
  }

  function randomSymbol() {
    return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function applyPalette(symbol: string) {
    const palettes: Record<string, [string, string]> = {
      circle: ["#7557ff", "#ffd84a"],
      triangle: ["#ef3e78", "#76efb2"],
      square: ["#007f72", "#ffb21c"],
    };
    const [orange, acid] = palettes[symbol];
    document.documentElement.style.setProperty("--orange", orange);
    document.documentElement.style.setProperty("--acid", acid);
    window.localStorage.setItem("site-palette", JSON.stringify({ orange, acid }));
  }

  function resetPalette() {
    document.documentElement.style.setProperty("--orange", "#f04424");
    document.documentElement.style.setProperty("--acid", "#c8f43d");
    window.localStorage.removeItem("site-palette");
    setMessage("The original palette is back.");
  }

  return (
    <main className="play-page">
      <nav className="nav shell" aria-label="Play navigation">
        <a className="brand" href="/" aria-label="Aarin Jain, home">AJ<span>.</span></a>
        <div className="nav-links writing-nav"><a href="/">Portfolio</a><a href="/writing">Writing</a><a href="/play" aria-current="page">Play</a></div>
        <span className="availability"><i /> {wins} palette {wins === 1 ? "win" : "wins"}</span>
      </nav>
      <section className="slots-section">
        <div className="shell slots-inner">
          <div className="slots-intro">
            <p className="eyebrow">Shape slots · 遊び</p>
            <h1>Shape your<br /><em>own luck.</em></h1>
            <p>No stakes, no coins—just geometry. Match three symbols and this page takes on a new color palette.</p>
          </div>
          <div className="slots-machine">
            <div className={`slot-reels ${spinning ? "spinning" : ""}`} aria-live="polite" aria-label={`Slot result: ${reels.join(", ")}`}>
              {reels.map((symbol, index) => <div className="slot-reel" key={index}><span className={`slot-shape ${symbol}`} aria-label={symbol} /></div>)}
            </div>
            <div className="slot-controls">
              <p role="status">{message}</p>
              <div><button className="slot-reset" type="button" onClick={resetPalette}>Reset palette</button><button className="slot-spin" type="button" onClick={spin} disabled={spinning}>{spinning ? "Spinning…" : "Spin shapes ↗"}</button></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
