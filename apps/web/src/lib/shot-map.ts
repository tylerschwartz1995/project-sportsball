export const SHOT_RINK = {
  left: 10,
  top: 10,
  width: 300,
  height: 255,
  centerY: 137.5,
} as const;

export function mapShotX(value: number): number {
  return (
    SHOT_RINK.left +
    (Math.max(0, Math.min(100, value)) / 100) * SHOT_RINK.width
  );
}

export function mapShotY(value: number): number {
  return (
    SHOT_RINK.centerY -
    (Math.max(-42.5, Math.min(42.5, value)) / 85) * SHOT_RINK.height
  );
}

export function shotNavigationIndex(
  currentIndex: number,
  key: string,
  shotCount: number,
): number | null {
  if (shotCount <= 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return shotCount - 1;
  if (key === "ArrowRight" || key === "ArrowDown") {
    return (currentIndex + 1) % shotCount;
  }
  if (key === "ArrowLeft" || key === "ArrowUp") {
    return (currentIndex - 1 + shotCount) % shotCount;
  }
  return null;
}
