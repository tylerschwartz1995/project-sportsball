export function resolveUrlChoice<T extends string>(
  requested: string | null,
  choices: readonly T[],
  fallback: T,
): T {
  return choices.includes(requested as T) ? (requested as T) : fallback;
}
