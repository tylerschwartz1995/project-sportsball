export type MobileColumn = { index: number; label: string };

/** Keep the entity visible and offer every other column in readable groups. */
export function mobileColumnGroups(columns: MobileColumn[], identity: number) {
  const metrics = columns.filter(column => column.index !== identity);
  const labels = metrics.map(column => column.label);
  const preferred = labels.includes("Opponent") ? ["Opponent", "Score", labels.includes("SV%") ? "SV%" : labels.includes("PTS") ? "PTS" : "Result"]
    : labels.includes("PTS") ? ["PTS", "G", "A"]
    : labels.includes("GF") ? ["GF", "GA", "DIFF"]
    : labels.includes("SV%") ? ["SV%", "GAA", "GP"]
    : labels.includes("xG%") ? ["xG%", "CF%", "FF%"] : [];
  // Standings uses points, games, and wins; player tables use points, goals, assists.
  if (preferred[0] === "PTS" && !labels.includes("G")) preferred.splice(1, 2, "GP", "W");
  const first = preferred.flatMap(label => metrics.filter(column => column.label === label));
  const remaining = metrics.filter(column => !first.includes(column));
  while (first.length < 3 && remaining.length) first.push(remaining.shift()!);
  const groups = first.length ? [first] : [];
  for (let i = 0; i < remaining.length; i += 3) groups.push(remaining.slice(i, i + 3));
  return groups.map(items => items.sort((a, b) => a.index - b.index));
}
