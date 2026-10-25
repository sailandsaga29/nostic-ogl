export type FlavorStockRow = {
  rowNumber: number;
  flavor: string;
  category: string;
  stock: number;
  staffPrice: number;
  memberPrice: number;
};

type ExistingFlavor = {
  id: number;
  name: string;
  category: string;
};

export type FlavorStockUpdate = {
  id: number;
  stock: number;
  price: number;
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeHeader = (value: unknown) =>
  typeof value === 'string' ? normalize(value) : '';

const valueToText = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

export async function parseFlavorStockWorkbook(
  contents: ArrayBuffer,
): Promise<{ rows: FlavorStockRow[]; errors: string[] }> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(contents);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return { rows: [], errors: ['The workbook has no worksheets.'] };
  }

  const headerCells = worksheet.getRow(1);
  const columns = new Map<string, number>();
  const errors: string[] = [];

  headerCells.eachCell((cell, columnNumber) => {
    const header = normalizeHeader(cell.value);
    const key =
      header === 'flavor'
        ? 'flavour'
        : header.replace(/\s+/g, '');
    if (!['flavour', 'category', 'stock', 'staffprice', 'memberprice'].includes(key)) return;
    if (columns.has(key)) {
      errors.push(`Row 1: Duplicate "${key}" column.`);
    } else {
      columns.set(key, columnNumber);
    }
  });

  for (const required of ['flavour', 'category', 'stock', 'staffprice', 'memberprice']) {
    if (!columns.has(required)) {
      const headerName = {
        flavour: 'Flavour',
        category: 'Category',
        stock: 'Stock',
        staffprice: 'Staff Price',
        memberprice: 'Member Price',
      }[required];
      errors.push(`Row 1: Missing required "${headerName}" column.`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const rows: FlavorStockRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const flavor = valueToText(row.getCell(columns.get('flavour')!).value);
    const category = valueToText(row.getCell(columns.get('category')!).value);
    const stockValue = row.getCell(columns.get('stock')!).value;
    const staffPriceValue = row.getCell(columns.get('staffprice')!).value;
    const memberPriceValue = row.getCell(columns.get('memberprice')!).value;
    if (
      !flavor &&
      !category &&
      [stockValue, staffPriceValue, memberPriceValue].every(
        (value) => value === null || value === undefined || value === '',
      )
    ) {
      return;
    }

    let rowIsValid = true;
    if (!flavor) {
      errors.push(`Row ${rowNumber}: Flavour is required.`);
      rowIsValid = false;
    }
    if (!category) {
      errors.push(`Row ${rowNumber}: Category is required.`);
      rowIsValid = false;
    }

    const parseNonNegativeNumber = (value: unknown, label: string) => {
      const text = valueToText(value);
      const number = typeof value === 'number' ? value : Number(text);
      if (
        value === null ||
        value === undefined ||
        text === '' ||
        !Number.isFinite(number) ||
        number < 0
      ) {
        errors.push(`Row ${rowNumber}: ${label} must be a non-negative number.`);
        rowIsValid = false;
        return 0;
      }
      return number;
    };
    const stock = parseNonNegativeNumber(stockValue, 'Stock');
    const staffPrice = parseNonNegativeNumber(staffPriceValue, 'Staff Price');
    const memberPrice = parseNonNegativeNumber(memberPriceValue, 'Member Price');

    if (rowIsValid) {
      rows.push({ rowNumber, flavor, category, stock, staffPrice, memberPrice });
    }
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('The worksheet has no stock rows to import.');
  }
  return { rows, errors };
}

export function resolveFlavorStockRows(
  rows: FlavorStockRow[],
  flavors: ExistingFlavor[],
): { updates: FlavorStockUpdate[]; errors: string[] } {
  const errors: string[] = [];
  const updates: FlavorStockUpdate[] = [];
  const flavorsByKey = new Map<string, ExistingFlavor[]>();
  const seenRows = new Set<string>();

  for (const flavor of flavors) {
    const key = `${normalize(flavor.name)}\u0000${normalize(flavor.category)}`;
    const matches = flavorsByKey.get(key) ?? [];
    matches.push(flavor);
    flavorsByKey.set(key, matches);
  }

  for (const row of rows) {
    const key = `${normalize(row.flavor)}\u0000${normalize(row.category)}`;
    if (seenRows.has(key)) {
      errors.push(`Row ${row.rowNumber}: Duplicate Flavour and Category entry.`);
      continue;
    }
    seenRows.add(key);

    const matches = flavorsByKey.get(key) ?? [];
    if (matches.length === 0) {
      errors.push(
        `Row ${row.rowNumber}: No existing flavor matches "${row.flavor}" in category "${row.category}".`,
      );
    } else if (matches.length > 1) {
      errors.push(
        `Row ${row.rowNumber}: "${row.flavor}" in category "${row.category}" matches multiple flavors.`,
      );
    } else {
      updates.push({
        id: matches[0].id,
        stock: row.stock,
        price: row.staffPrice,
      });
    }
  }

  return { updates: errors.length === 0 ? updates : [], errors };
}
