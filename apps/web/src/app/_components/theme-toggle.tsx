"use client";

const STORAGE_KEY = "sportsball-theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Switch between light and dark mode"
      title="Switch between light and dark mode"
      className="theme-toggle"
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        <span className="theme-icon-sun">☀</span>
        <span className="theme-icon-moon">☾</span>
      </span>
      {compact ? null : <span className="theme-toggle-label" />}
    </button>
  );
}
