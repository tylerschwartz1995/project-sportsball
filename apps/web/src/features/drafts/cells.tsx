

export function MetricCell({
  value,
  displayValue,
}: {
  value: number | null;
  displayValue?: number | string;
}) {
  return (
    <td data-sort-value={value ?? undefined}>
      {value === null
        ? "—"
        : (displayValue ?? value.toLocaleString("en-CA"))}
    </td>
  );
}

export function NumberCell({ value }: { value: number | string }) {
  return <td className="workspace-number-cell">{value}</td>;
}
