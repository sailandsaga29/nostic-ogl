export function parseId(value: string | number): number {
  const id = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Invalid id: ${value}`);
  }
  return id;
}
