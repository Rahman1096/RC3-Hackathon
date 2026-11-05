"use client";

import { useEffect, useSyncExternalStore } from "react";

export function ThemeToggle() {
  const light = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("talent-theme-change", onChange);
      return () => window.removeEventListener("talent-theme-change", onChange);
    },
    () => document.documentElement.dataset.theme === "light",
    () => false,
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("talent-theme");
    const prefersLight = saved ? saved === "light" : window.matchMedia("(prefers-color-scheme: light)").matches;
    document.documentElement.dataset.theme = prefersLight ? "light" : "dark";
  }, []);

  function toggle() {
    const next = !light;
    document.documentElement.dataset.theme = next ? "light" : "dark";
    window.localStorage.setItem("talent-theme", next ? "light" : "dark");
    window.dispatchEvent(new Event("talent-theme-change"));
  }

  return <button type="button" role="switch" aria-checked={light} onClick={toggle} aria-label={`Switch to ${light ? "dark" : "light"} mode`} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-2 py-1 transition hover:border-cyan-400 active:scale-95"><span className="text-xs font-medium">{light ? "Light" : "Dark"}</span><span className={`relative h-5 w-9 rounded-full transition ${light ? "bg-cyan-500" : "bg-slate-700"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${light ? "left-4" : "left-0.5"}`} /></span></button>;
}
