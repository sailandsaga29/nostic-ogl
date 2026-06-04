export type SortDirection = 'asc' | 'desc';

export type FlavorListSortKey =
  | 'name'
  | 'category'
  | 'price'
  | 'stock'
  | 'quantity'
  | 'revenue'
  | 'carryForwarded';

export type FlavorListSortRow = {
  name?: string | null;
  category?: string | null;
  stock?: number;
  price?: number;
  quantity?: number;
  revenue?: number;
  carryForwarded?: number;
};

export function sortFlavorList<T extends FlavorListSortRow>(
  items: T[],
  sortBy: FlavorListSortKey,
  sortDir: SortDirection,
): T[] {
  const list = [...items];
  const dir = sortDir === 'asc' ? 1 : -1;

  switch (sortBy) {
    case 'name':
      list.sort(
        (a, b) =>
          String(a.name ?? '')
            .toLowerCase()
            .localeCompare(String(b.name ?? '').toLowerCase(), 'en', {
              sensitivity: 'base',
            }) * dir,
      );
      break;
    case 'category':
      list.sort(
        (a, b) =>
          String(a.category ?? '')
            .toLowerCase()
            .localeCompare(String(b.category ?? '').toLowerCase(), 'en', {
              sensitivity: 'base',
            }) * dir,
      );
      break;
    case 'price':
      list.sort(
        (a, b) => (Number(a.price ?? 0) - Number(b.price ?? 0)) * dir,
      );
      break;
    case 'stock':
      list.sort(
        (a, b) => (Number(a.stock ?? 0) - Number(b.stock ?? 0)) * dir,
      );
      break;
    case 'quantity':
      list.sort(
        (a, b) => (Number(a.quantity ?? 0) - Number(b.quantity ?? 0)) * dir,
      );
      break;
    case 'revenue':
      list.sort(
        (a, b) => (Number(a.revenue ?? 0) - Number(b.revenue ?? 0)) * dir,
      );
      break;
    case 'carryForwarded':
      list.sort(
        (a, b) =>
          (Number(a.carryForwarded ?? 0) - Number(b.carryForwarded ?? 0)) * dir,
      );
      break;
  }

  return list;
}

export const LOW_STOCK_THRESHOLD = 15;

export const isLowStock = (stock: number) => stock < LOW_STOCK_THRESHOLD;

export function sortColumnIcon(
  column: FlavorListSortKey,
  activeColumn: FlavorListSortKey,
  direction: SortDirection,
) {
  if (activeColumn !== column) return '⇅';
  return direction === 'asc' ? '▲' : '▼';
}
