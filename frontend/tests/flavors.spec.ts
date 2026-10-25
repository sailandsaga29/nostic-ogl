import { expect, test, type Page, type Route } from '@playwright/test';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

type Flavor = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  quantity: number;
  carryForwarded: number;
  revenue: number;
  image: string;
  isActive: boolean;
  isSeasonal: boolean;
};

const makeFlavors = (): Flavor[] => {
  const entries = [
    ['Almond Joy', 'Popsicles'],
    ['Blueberry Blast', 'Sugar Free'],
    ['Choco Cone', 'Cones'],
    ['Dragonfruit', '100 ML'],
    ['Elderberry', '500 ML'],
    ['Fig Delight', 'SIP Ups'],
    ['Guava Swirl', 'Sorbet'],
    ['Honey Dates', 'Seasonal Specials'],
    ['Island Mango', 'Popsicles'],
    ['Jackfruit Cream', 'Cones'],
    ['Kiwi Ice', 'Sorbet'],
    ['Lemon Zest', '100 ML'],
  ] as const;

  return entries.map(([name, category], index) => ({
    id: index + 1,
    name,
    category,
    description: `${name} test description`,
    price: 100 + index * 10,
    stock: 12 + index,
    quantity: 4 + index,
    carryForwarded: index % 3,
    revenue: getMockMemberPrice(100 + index * 10) * (4 + index),
    image: '',
    isActive: index !== 2,
    isSeasonal: index === 7,
  }));
};

function getMockMemberPrice(staffPrice: number) {
  const discounted = staffPrice * 0.9;
  const whole = Math.floor(discounted);
  return discounted - whole > 0.5 ? whole + 1 : whole;
}

async function installFlavorApiMocks(page: Page) {
  let flavors = makeFlavors();
  let nextId = flavors.length + 1;

  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'flavor-test-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        name: 'Flavor Test Admin',
        email: 'flavor-test@example.com',
        role: 'super_admin',
      }),
    );
  });

  await page.route('**/api/flavors**', async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    const method = route.request().method();

    if (pathname === '/api/flavors/meta/years' && method === 'GET') {
      await route.fulfill({ json: [2026] });
      return;
    }
    if (pathname === '/api/flavors/meta/months/2026' && method === 'GET') {
      await route.fulfill({ json: [10, 9, 8] });
      return;
    }
    if (pathname === '/api/flavors/monthly/2026/10' && method === 'GET') {
      await route.fulfill({ json: flavors });
      return;
    }
    if (pathname === '/api/flavors/monthly/2026/9' && method === 'GET') {
      await route.fulfill({ json: [] });
      return;
    }
    if (pathname === '/api/flavors' && method === 'GET') {
      await route.fulfill({ json: flavors });
      return;
    }
    if (pathname === '/api/flavors/bulk-update' && method === 'POST') {
      const body = route.request().postDataJSON() as {
        items: Array<Partial<Flavor> & { id: number }>;
      };
      flavors = flavors.map((flavor) => {
        const updated = body.items.find((item) => item.id === flavor.id);
        if (!updated) return flavor;

        const quantity =
          typeof updated.stock === 'number'
            ? Number(updated.stock)
            : flavor.quantity;
        return {
          ...flavor,
          ...updated,
          quantity,
          revenue:
            quantity *
            getMockMemberPrice(Number(updated.price ?? flavor.price)),
        };
      });
      await route.fulfill({ json: { message: 'Flavors updated' } });
      return;
    }
    if (pathname === '/api/flavors' && method === 'POST') {
      const body = route.request().postDataJSON() as Omit<Flavor, 'id'>;
      const created: Flavor = {
        ...body,
        id: nextId++,
        quantity: body.stock,
        carryForwarded: 0,
        revenue: body.price * body.stock,
      };
      flavors = [...flavors, created];
      await route.fulfill({ status: 201, json: created });
      return;
    }

    await route.fulfill({ status: 404, json: { message: 'Unexpected API request' } });
  });
}

async function openFlavors(page: Page) {
  await page.goto('/admin/flavors');
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('row')).toHaveCount(11);
}

function flavorRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

function firstFlavorRow(page: Page) {
  return page.locator('tbody tr').first();
}

async function makeStockWorkbook(
  rows: unknown[][],
  headers = ['Flavour', 'Category', 'Stock', 'Staff Price', 'Member Price'],
) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock');
  worksheet.addRow(headers);
  rows.forEach((row) =>
    worksheet.addRow([
      ...row,
      ...(row.length === 3 ? [100, 90] : []),
    ]),
  );
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test.beforeEach(async ({ page }) => {
  await installFlavorApiMocks(page);
  await openFlavors(page);
});

test('renders stock, pricing, investment, sales status and all known categories', async ({
  page,
}) => {
  for (const header of [
    'Flavour',
    'Category',
    'Carry Forwarded',
    'Restocked Quantity',
    'Current Stock',
    'Staff Price',
    'Member Price',
    'Invested Amount',
    'Sales Status',
  ]) {
    await expect(page.getByRole('columnheader', { name: new RegExp(header) })).toBeVisible();
  }

  await expect(flavorRow(page, 'Almond Joy')).toContainText('Popsicles');
  await expect(flavorRow(page, 'Almond Joy')).toContainText('₹100');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(2)).toHaveText('0');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(3)).toHaveText('4');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(6)).toHaveText('₹90');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(7)).toHaveText('₹360');
  const categoryFilter = page.getByLabel('Filter by category');
  for (const category of [
    'Popsicles',
    'Sugar Free',
    'Cones',
    '100 ML',
    '500 ML',
    'SIP Ups',
    'Sorbet',
    'Seasonal Specials',
  ]) {
    await expect(categoryFilter).toContainText(category);
  }
});

test('imports stock and staff price from Excel and recalculates member price', async ({ page }) => {
  const workbook = await makeStockWorkbook([
    ['Almond Joy', 'Popsicles', 0, 150, 135],
    ['Lemon Zest', '100 ML', 27, 120, 108],
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'flavor-stock.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook,
  });

  await expect(page.getByRole('status')).toContainText(
    'Stock and staff prices updated for 2 flavors.',
  );
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText('0');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(5)).toHaveText('₹150');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(6)).toHaveText('₹135');
  await page.getByRole('searchbox', { name: 'Search flavors' }).fill('Lemon Zest');
  await expect(flavorRow(page, 'Lemon Zest').getByRole('cell').nth(4)).toHaveText('27');
  await expect(flavorRow(page, 'Lemon Zest').getByRole('cell').nth(5)).toHaveText('₹120');
});

test('downloads a latest stock workbook from the current flavor list', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Latest Stock' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^Flavors-Stock-\d{4}-\d{2}-\d{2}\.xlsx$/);
  await expect(page.getByRole('status')).toContainText(
    'Downloaded current stock for 12 flavors.',
  );
});

test('rejects the whole Excel upload and reports row numbers for unmatched flavors', async ({
  page,
}) => {
  let bulkUpdateRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/flavors/bulk-update') {
      bulkUpdateRequests += 1;
    }
  });
  const workbook = await makeStockWorkbook([
    ['Almond Joy', 'Popsicles', 0],
    ['Not a flavor', 'Popsicles', 10],
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'flavor-stock.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook,
  });

  await expect(page.getByRole('alert')).toContainText('Row 3');
  await expect(page.getByRole('alert')).toContainText('No stock was updated');
  expect(bulkUpdateRequests).toBe(0);
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText('12');
});

test('rejects negative stock without submitting any rows', async ({ page }) => {
  const workbook = await makeStockWorkbook([['Almond Joy', 'Popsicles', -1]]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid-stock.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook,
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Row 2: Stock must be a non-negative number.');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText('12');
});

test('rejects duplicate flavor rows without submitting any rows', async ({ page }) => {
  const workbook = await makeStockWorkbook([
    ['Almond Joy', 'Popsicles', 1],
    ['Almond Joy', 'Popsicles', 5],
  ]);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid-stock.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook,
  });
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Row 3: Duplicate Flavour and Category entry.');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText('12');
});

test('rejects workbooks with missing required headers', async ({ page }) => {
  const workbook = await makeStockWorkbook(
    [['Almond Joy', 'Popsicles', 5]],
    ['Name', 'Category', 'Stock', 'Staff Price', 'Member Price'],
  );

  await page.locator('input[type="file"]').setInputFiles({
    name: 'invalid-headers.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: workbook,
  });

  await expect(page.getByRole('alert')).toContainText('Missing required "Flavour" column');
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText('12');
});

test('filters known and database-provided categories and restores All', async ({ page }) => {
  const categoryFilter = page.getByLabel('Filter by category');

  await categoryFilter.selectOption('Seasonal Specials');
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(flavorRow(page, 'Honey Dates')).toBeVisible();
  await expect(flavorRow(page, 'Almond Joy')).toHaveCount(0);

  await categoryFilter.selectOption('All');
  await expect(page.getByRole('row')).toHaveCount(11);
  await expect(flavorRow(page, 'Almond Joy')).toBeVisible();
});

test('searches flavors by name and category with or without table editing', async ({
  page,
}) => {
  const search = page.getByRole('searchbox', { name: 'Search flavors' });

  await search.fill('lemon');
  await expect(page.getByRole('row')).toHaveCount(2);
  await expect(flavorRow(page, 'Lemon Zest')).toBeVisible();
  await expect(flavorRow(page, 'Almond Joy')).toHaveCount(0);

  await search.fill('100 ml');
  await expect(page.getByRole('row')).toHaveCount(3);
  await expect(flavorRow(page, 'Dragonfruit')).toBeVisible();
  await expect(flavorRow(page, 'Lemon Zest')).toBeVisible();

  await search.fill('no such flavor');
  await expect(page.getByRole('cell', { name: 'No flavors match "no such flavor".' })).toBeVisible();
  await expect(page.getByText('No data found for October 2026')).toHaveCount(0);

  await search.fill('');
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await search.fill('honey');
  const editingRows = page.locator('tbody tr');
  await expect(editingRows).toHaveCount(1);
  await expect(editingRows.first().locator('input[type="text"]')).toHaveValue(
    'Honey Dates',
  );
});

test('sorts table columns in ascending and descending order', async ({ page }) => {
  const nameHeader = page.getByRole('columnheader', { name: /Flavour/ });
  await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('button', { name: /Flavour/ }).click();
  await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
  await expect(page.getByRole('row').nth(1)).toContainText('Lemon Zest');

  for (const column of [
    'Category',
    'Carry Forwarded',
    'Restocked Quantity',
    'Current Stock',
    'Invested Amount',
  ]) {
    const header = page.getByRole('columnheader', { name: new RegExp(column) });
    await page.getByRole('button', { name: new RegExp(column) }).click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
  }
});

test('changes month and shows a clear empty-month message', async ({ page }) => {
  await page.getByRole('button', { name: 'Sep' }).click();
  await expect(page.getByText('No data found for September 2026').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeDisabled();

  await page.getByRole('button', { name: 'Oct' }).click();
  await expect(flavorRow(page, 'Almond Joy')).toBeVisible();
});

test('shows No data found for October 2026 when that month has no flavors', async ({
  page,
}) => {
  await page.route('**/api/flavors/monthly/2026/10', async (route) => {
    await route.fulfill({ json: [] });
  });
  await page.getByRole('button', { name: 'Sep' }).click();
  await expect(page.getByText('No data found for September 2026').first()).toBeVisible();
  await page.getByRole('button', { name: 'Oct' }).click();

  await expect(page.getByText('No data found for October 2026').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeDisabled();
});

test('shows a no-data state and disables table editing for a future month', async ({
  page,
}) => {
  await page.route('**/api/flavors/meta/years', async (route) => {
    await route.fulfill({ json: [2026, 2027] });
  });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeVisible();
  await page.getByLabel('Filter by year').selectOption('2027');

  await expect(
    page.getByText('No data found for October 2027 (future month)').first(),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeDisabled();
});

test('paginates flavor rows and disables navigation at each end', async ({ page }) => {
  await expect(page.getByText('1–10 of 12 flavours')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('11–12 of 12 flavours')).toBeVisible();
  await expect(flavorRow(page, 'Lemon Zest')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByText('1–10 of 12 flavours')).toBeVisible();
});

test('bulk table edit saves changes across editable fields', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Table' }).click();
  const row = firstFlavorRow(page);

  await row.locator('input[type="text"]').fill('Almond Joy Updated');
  await row.locator('select').selectOption('Seasonal Specials');
  await row.locator('input[type="number"]').nth(0).fill('25');
  await row.locator('input[type="number"]').nth(1).fill('150');
  await row.locator('input[type="checkbox"]').nth(0).uncheck();
  await row.locator('input[type="checkbox"]').nth(1).check();
  await expect(row.getByRole('cell').nth(6)).toHaveText('₹135');

  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/flavors/bulk-update') &&
      request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Table' }).click();
  const request = await updateRequest;
  const payload = request.postDataJSON() as { items: Flavor[] };
  const updated = payload.items.find((item) => item.id === 1);

  expect(updated).toMatchObject({
    name: 'Almond Joy Updated',
    category: 'Seasonal Specials',
    stock: 25,
    price: 150,
    isActive: false,
    isSeasonal: true,
  });
  await expect(page.getByText('Flavor list updated')).toBeVisible();
  await expect(flavorRow(page, 'Almond Joy Updated')).toContainText('Seasonal Specials');
  await expect(flavorRow(page, 'Almond Joy Updated')).toContainText('Disabled');
  await expect(page.getByRole('button', { name: 'Edit Table' })).toBeVisible();
});

test('bulk table edit updates stock for multiple flavors in one save', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await expect(page.getByRole('button', { name: 'Save Table' })).toBeVisible();
  const firstRow = page.locator('tbody tr').nth(0);
  const secondRow = page.locator('tbody tr').nth(1);
  await firstRow.locator('input[type="number"]').nth(0).fill('20');
  await secondRow.locator('input[type="number"]').nth(0).fill('30');

  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/flavors/bulk-update') &&
      request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Table' }).click();
  const payload = (await updateRequest).postDataJSON() as { items: Flavor[] };

  expect(payload.items.find((item) => item.id === 1)?.stock).toBe(20);
  expect(payload.items.find((item) => item.id === 2)?.stock).toBe(30);
  expect(payload.items.find((item) => item.id === 3)?.stock).toBeUndefined();
  await expect(flavorRow(page, 'Almond Joy').getByRole('cell').nth(4)).toHaveText(
    '20',
  );
  await expect(
    flavorRow(page, 'Blueberry Blast').getByRole('cell').nth(4),
  ).toHaveText('30');
});

test('recalculates restock when zero stock is explicitly edited, even if unchanged', async ({
  page,
}) => {
  let initialMonthlyResponse = true;
  await page.route('**/api/flavors/monthly/2026/10', async (route) => {
    if (!initialMonthlyResponse) {
      await route.fallback();
      return;
    }
    initialMonthlyResponse = false;
    const flavors = makeFlavors().map((flavor) =>
      flavor.id === 1
        ? { ...flavor, stock: 0, quantity: 2, revenue: 180 }
        : flavor,
    );
    await route.fulfill({ json: flavors });
  });

  await page.getByRole('button', { name: 'Refresh flavors' }).click();
  const row = flavorRow(page, 'Almond Joy');
  await expect(row.getByRole('cell').nth(3)).toHaveText('2');
  await expect(row.getByRole('cell').nth(4)).toHaveText('0');

  await page.getByRole('button', { name: 'Edit Table' }).click();
  const editRow = page.locator('tbody tr').nth(0);
  await editRow.locator('input[type="number"]').nth(0).focus();
  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/flavors/bulk-update') &&
      request.method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save Table' }).click();
  const payload = (await updateRequest).postDataJSON() as {
    items: Array<Partial<Flavor> & { id: number }>;
  };

  expect(payload.items.find((flavor) => flavor.id === 1)?.stock).toBe(0);
  expect(payload.items.find((flavor) => flavor.id === 2)?.stock).toBeUndefined();
  const updatedRow = flavorRow(page, 'Almond Joy');
  await expect(updatedRow.getByRole('cell').nth(3)).toHaveText('0');
  await expect(updatedRow.getByRole('cell').nth(7)).toHaveText('₹0');
});

test('reduces restocked quantity and investment when stock is edited down to zero', async ({
  page,
}) => {
  const summary = page.getByText(/Total invested for October 2026:/).first();
  const readInvestedTotal = async () => {
    const text = await summary.innerText();
    const value = text.match(/₹([\d,]+)/)?.[1];
    expect(value).toBeDefined();
    return Number(value!.replaceAll(',', ''));
  };

  const initialTotal = await readInvestedTotal();
  const updateFirstStock = async (stock: number) => {
    await page.getByRole('button', { name: 'Edit Table' }).click();
    await firstFlavorRow(page).locator('input[type="number"]').nth(0).fill(String(stock));
    const updateRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/flavors/bulk-update') &&
        request.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save Table' }).click();
    await updateRequest;
  };

  await updateFirstStock(10);
  let row = flavorRow(page, 'Almond Joy');
  await expect(row.getByRole('cell').nth(3)).toHaveText('10');
  await expect(row.getByRole('cell').nth(4)).toHaveText('10');
  await expect(row.getByRole('cell').nth(7)).toHaveText('₹900');
  expect(await readInvestedTotal()).toBe(initialTotal + 540);

  await updateFirstStock(0);
  row = flavorRow(page, 'Almond Joy');
  await expect(row.getByRole('cell').nth(3)).toHaveText('0');
  await expect(row.getByRole('cell').nth(4)).toHaveText('0');
  await expect(row.getByRole('cell').nth(7)).toHaveText('₹0');
  expect(await readInvestedTotal()).toBe(initialTotal - 360);
});

test('cancels bulk edits without persisting draft changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await firstFlavorRow(page).locator('input[type="text"]').fill('Unsaved Draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await expect(flavorRow(page, 'Almond Joy')).toBeVisible();
  await expect(flavorRow(page, 'Unsaved Draft')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save Table' })).toHaveCount(0);
});

test('discards bulk drafts when the category filter changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await firstFlavorRow(page).locator('input[type="text"]').fill('Filtered Draft');
  await page.getByLabel('Filter by category').selectOption('Popsicles');

  await expect(page.getByRole('button', { name: 'Save Table' })).toHaveCount(0);
  await expect(flavorRow(page, 'Almond Joy')).toBeVisible();
  await expect(flavorRow(page, 'Filtered Draft')).toHaveCount(0);
});

test('keeps table editing open and reports an API error when bulk save fails', async ({
  page,
}) => {
  await page.route('**/api/flavors/bulk-update', async (route) => {
    await route.fulfill({
      status: 400,
      json: { message: 'Bulk update rejected for test' },
    });
  });
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await firstFlavorRow(page).locator('input[type="text"]').fill('Rejected Update');
  await page.getByRole('button', { name: 'Save Table' }).click();

  await expect(page.getByText('Bulk update rejected for test')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Table' })).toBeVisible();
  await expect(firstFlavorRow(page).locator('input[type="text"]')).toHaveValue('Rejected Update');
});

test('shows which flavor failed when a bulk save partially fails', async ({
  page,
}) => {
  await page.route('**/api/flavors/bulk-update', async (route) => {
    await route.fulfill({
      status: 500,
      json: {
        message:
          'Failed to update "Strawberry" (ID 2). Other flavors were processed; successful changes have been saved.',
      },
    });
  });
  await page.getByRole('button', { name: 'Edit Table' }).click();
  await page.getByRole('button', { name: 'Save Table' }).click();

  await expect(
    page.getByText(/Failed to update "Strawberry" \(ID 2\)/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Table' })).toBeVisible();
});

for (const invalid of [
  { field: 'name', value: '', message: 'Flavor name is required' },
  { field: 'category', value: '', message: 'Please select a category' },
  { field: 'stock', value: '-1', message: 'Stock must be 0 or greater' },
  { field: 'price', value: '-1', message: 'Price must be 0 or greater' },
] as const) {
  test(`blocks table save when ${invalid.field} is invalid`, async ({ page }) => {
    await page.getByRole('button', { name: 'Edit Table' }).click();
    const row = firstFlavorRow(page);
    if (invalid.field === 'name') {
      await row.locator('input[type="text"]').fill(invalid.value);
    } else if (invalid.field === 'category') {
      await row.locator('select').selectOption(invalid.value);
    } else {
      const inputIndex = invalid.field === 'stock' ? 0 : 1;
      await row.locator('input[type="number"]').nth(inputIndex).fill(invalid.value);
    }

    let bulkUpdateRequests = 0;
    page.on('request', (request) => {
      if (
        request.url().endsWith('/api/flavors/bulk-update') &&
        request.method() === 'POST'
      ) {
        bulkUpdateRequests += 1;
      }
    });
    await page.getByRole('button', { name: 'Save Table' }).click();
    await expect(page.getByText(invalid.message)).toBeVisible();
    expect(bulkUpdateRequests).toBe(0);
  });
}

test('adds a flavor with valid details and reflects its category in the table', async ({
  page,
}) => {
  await page.getByRole('button', { name: '+ Add Flavor' }).click();
  const modal = page.locator('div.fixed.inset-0');
  await expect(modal.getByRole('heading', { name: 'Add New Flavor' })).toBeVisible();
  await modal.locator('input[type="text"]').fill('Mint Test');
  await modal.locator('select').selectOption('Sorbet');
  await modal.locator('input[type="number"]').nth(0).fill('75');
  await modal.locator('input[type="number"]').nth(1).fill('8');
  await modal.locator('input[type="url"]').fill('https://example.test/mint.png');
  await modal.locator('textarea').fill('A test flavor');
  await modal.locator('input[type="checkbox"]').nth(1).check();

  const createRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/flavors') && request.method() === 'POST',
  );
  await modal.getByRole('button', { name: 'Create Flavor' }).click();
  const request = await createRequest;

  expect(request.postDataJSON()).toMatchObject({
    name: 'Mint Test',
    category: 'Sorbet',
    price: 75,
    stock: 8,
    image: 'https://example.test/mint.png',
    description: 'A test flavor',
    isActive: true,
    isSeasonal: true,
  });
  await expect(page.getByRole('heading', { name: 'Add New Flavor' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(flavorRow(page, 'Mint Test')).toBeVisible();
});

test('keeps the add flavor dialog usable on phone-sized and desktop screens', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.getByRole('button', { name: '+ Add Flavor' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const mobileBounds = await dialog.boundingBox();
  expect(mobileBounds).not.toBeNull();
  expect(mobileBounds!.x).toBeGreaterThanOrEqual(0);
  expect(mobileBounds!.y).toBeGreaterThanOrEqual(0);
  expect(mobileBounds!.x + mobileBounds!.width).toBeLessThanOrEqual(320);
  expect(mobileBounds!.y + mobileBounds!.height).toBeLessThanOrEqual(480);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);

  await dialog.getByRole('button', { name: 'Create Flavor' }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: 'Create Flavor' })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopBounds = await dialog.boundingBox();
  expect(desktopBounds).not.toBeNull();
  expect(desktopBounds!.x).toBeGreaterThanOrEqual(0);
  expect(desktopBounds!.x + desktopBounds!.width).toBeLessThanOrEqual(1280);
  expect(desktopBounds!.y + desktopBounds!.height).toBeLessThanOrEqual(900);
});

test('keeps the add form open and reports an API error when creation fails', async ({
  page,
}) => {
  await page.route('**/api/flavors', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 409,
        json: { message: 'Flavor already exists' },
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: '+ Add Flavor' }).click();
  const modal = page.locator('div.fixed.inset-0');
  await modal.locator('input[type="text"]').fill('Duplicate Flavor');
  await modal.locator('select').selectOption('Sorbet');
  await modal.locator('input[type="number"]').nth(0).fill('75');
  await modal.locator('input[type="number"]').nth(1).fill('8');
  await modal.getByRole('button', { name: 'Create Flavor' }).click();

  await expect(page.getByText('Flavor already exists')).toBeVisible();
  await expect(modal).toBeVisible();
});

test('cancels flavor creation and resets the form when reopened', async ({ page }) => {
  await page.getByRole('button', { name: '+ Add Flavor' }).click();
  let modal = page.locator('div.fixed.inset-0');
  await modal.locator('input[type="text"]').fill('Discarded Flavor');
  await modal.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'Add New Flavor' })).toHaveCount(0);

  await page.getByRole('button', { name: '+ Add Flavor' }).click();
  modal = page.locator('div.fixed.inset-0');
  await expect(modal.locator('input[type="text"]')).toHaveValue('');
});

for (const invalid of [
  { field: 'name', value: '', message: 'Flavor name is required' },
  { field: 'category', value: '', message: 'Please select a category' },
  { field: 'stock', value: '-1', message: 'Stock must be 0 or greater' },
  { field: 'price', value: '-1', message: 'Price must be 0 or greater' },
] as const) {
  test(`blocks flavor creation when ${invalid.field} is invalid`, async ({ page }) => {
    await page.getByRole('button', { name: '+ Add Flavor' }).click();
    const modal = page.locator('div.fixed.inset-0');
    await modal.locator('input[type="text"]').fill('Validation Flavor');
    await modal.locator('select').selectOption('Popsicles');

    if (invalid.field === 'name') {
      await modal.locator('input[type="text"]').fill(invalid.value);
    } else if (invalid.field === 'category') {
      await modal.locator('select').selectOption(invalid.value);
    } else {
      const inputIndex = invalid.field === 'stock' ? 1 : 0;
      await modal.locator('input[type="number"]').nth(inputIndex).fill(invalid.value);
    }

    const createRequest = page.waitForRequest(
      (request) =>
        request.url().endsWith('/api/flavors') && request.method() === 'POST',
      { timeout: 500 },
    );
    await modal.getByRole('button', { name: 'Create Flavor' }).click();
    await expect(page.getByText(invalid.message)).toBeVisible();
    await expect(createRequest).rejects.toThrow();
    await expect(modal).toBeVisible();
  });
}

test('refreshes the displayed month instead of replacing it with the full flavor list', async ({
  page,
}) => {
  const monthlyRefresh = page.waitForRequest(
    (request) =>
      request.url().endsWith('/api/flavors/monthly/2026/10') &&
      request.method() === 'GET',
  );
  await page.getByRole('button', { name: 'Refresh flavors' }).click();
  await monthlyRefresh;
  await expect(flavorRow(page, 'Almond Joy')).toBeVisible();
});
