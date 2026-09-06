"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

const STORAGE_KEY = "sportsball-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);

  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The theme still works when browser privacy settings block storage.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!ready}
      aria-label="Switch between light and dark mode"
      title="Switch between light and dark mode"
      className="theme-toggle"
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        <svg className="theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
        <svg className="theme-icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></svg>
      </span>
      {compact ? null : <span className="theme-toggle-label" />}
    </button>
  );
}
