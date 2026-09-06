
export function NumericCell({
  value,
  highlight = false,
}: {
  value: number | string | null;
  highlight?: boolean;
}) {
  return (
    <td
      className={`workspace-semantic-number px-3 py-3 text-center tabular-nums ${highlight ? "font-semibold text-[var(--accent)]" : "text-[var(--foreground-soft)]"
        }`}
    >
      {value ?? "—"}
    </td>
  );
}
