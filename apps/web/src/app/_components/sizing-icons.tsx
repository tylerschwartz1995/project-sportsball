export function SortIndicator({ direction }: { direction?: "asc" | "desc" }) {
  return (
    <svg
      aria-hidden="true"
      className="workspace-sort-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction !== "desc" ? <path d="M5 12V3m-3 3 3-3 3 3" /> : null}
      {direction !== "asc" ? <path d="M11 4v9m-3-3 3 3 3-3" /> : null}
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18M7 15h2m4 0h2m-8 3h2" />
    </svg>
  );
}
