export function perSixty(value: number | null | undefined, iceTimeSeconds: number): number | null {
  return value == null || !Number.isFinite(value) || !Number.isFinite(iceTimeSeconds) || iceTimeSeconds <= 0
    ? null
    : value * 3600 / iceTimeSeconds;
}
