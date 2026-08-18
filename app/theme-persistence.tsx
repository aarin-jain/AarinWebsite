"use client";

import { useEffect } from "react";

export function ThemePersistence() {
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("site-palette");
      if (!saved) return;
      const palette = JSON.parse(saved) as { orange?: string; acid?: string };
      if (palette.orange) document.documentElement.style.setProperty("--orange", palette.orange);
      if (palette.acid) document.documentElement.style.setProperty("--acid", palette.acid);
    } catch {
      window.localStorage.removeItem("site-palette");
    }
  }, []);
  return null;
}
