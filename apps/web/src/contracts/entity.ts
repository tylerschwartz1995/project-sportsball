export function parseNhlId(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^\d{1,10}$/.test(value)) {
    return null;
  }

  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
