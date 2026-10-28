import { expect, test, type Page, type Route } from '@playwright/test';

type Role = 'super_admin' | 'manager' | 'staff';

const demoUser = (role: Role) => ({
  id: 1,
  name: 'Website Test User',
  email: 'website-test@example.com',
  role,
  branchCode: 'TEST',
});

async function installApiMocks(page: Page) {
  await page.route('**/api/**', async (route: Route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname === '/api/auth/login' && request.method() === 'POST') {
      const credentials = request.postDataJSON() as {
        email?: string;
        password?: string;
      };
      if (
        credentials.email !== 'website-test@example.com' ||
        credentials.password !== 'ValidPassword123!'
      ) {
        await route.fulfill({
          status: 401,
          json: { message: 'Invalid credentials' },
        });
        return;
      }

      await route.fulfill({
        json: {
          user: demoUser('staff'),
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token',
        },
      });
      return;
    }

    if (pathname === '/api/flavors' && request.method() === 'GET') {
      await route.fulfill({
        json: [
          {
            id: 1,
            name: 'Test Vanilla',
            category: 'Popsicles',
            price: 50,
            stock: 8,
            isActive: true,
            isSeasonal: false,
            image: '',
          },
        ],
      });
      return;
    }

    await route.fulfill({ json: [] });
  });
}

async function authenticateAs(page: Page, role: Role) {
  await page.addInitScript((user) => {
    localStorage.setItem('accessToken', 'test-access-token');
    localStorage.setItem('user', JSON.stringify(user));
  }, demoUser(role));
}

test.beforeEach(async ({ page }) => {
  await installApiMocks(page);
});

test('shows the login screen at the public entry routes', async ({ page }) => {
  for (const path of ['/', '/login']) {
    await page.goto(path);
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  }
});

test('rejects invalid login credentials with visible feedback', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('wrong@example.com');
  await page.getByPlaceholder('Password').fill('incorrect');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('logs in successfully and redirects a staff user to the POS', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('website-test@example.com');
  await page.getByPlaceholder('Password').fill('ValidPassword123!');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/staff\/pos$/);
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End Shift' })).toBeVisible();
});

test('redirects unauthenticated users away from protected routes', async ({
  page,
}) => {
  for (const path of [
    '/admin/dashboard',
    '/manager/dashboard',
    '/staff/pos',
    '/staff/orders',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  }
});

test('denies a staff user access to an admin-only route', async ({ page }) => {
  await authenticateAs(page, 'staff');
  await page.goto('/admin/dashboard');
  await expect(page.getByText('Access Denied')).toBeVisible();
});

test('renders each admin page without uncaught runtime errors', async ({
  page,
}) => {
  await authenticateAs(page, 'super_admin');
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  for (const path of [
    '/admin/dashboard',
    '/admin/flavors',
    '/admin/inventory',
    '/admin/accounts',
    '/admin/orders',
    '/admin/profile',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  }

  expect(runtimeErrors).toEqual([]);
});

test('renders manager dashboard and staff pages without uncaught runtime errors', async ({
  page,
}) => {
  await authenticateAs(page, 'manager');
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));

  await page.goto('/manager/dashboard');
  await expect(page.getByRole('heading', { name: 'Manager Dashboard' })).toBeVisible();

  await authenticateAs(page, 'staff');
  await page.goto('/staff/pos');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Test Vanilla' }),
  ).toBeVisible();

  await page.goto('/staff/orders');
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('button', { name: 'End Shift' })).toBeVisible();

  expect(runtimeErrors).toEqual([]);
});

test('admin navigation reaches each primary section on desktop and mobile', async ({
  page,
}) => {
  await authenticateAs(page, 'super_admin');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/admin/dashboard');

  for (const [label, path] of [
    ['FLAVORS STOCK', '/admin/flavors'],
    ['EXPENSES', '/admin/inventory'],
    ['ACCOUNTS', '/admin/accounts'],
    ['ORDERS', '/admin/orders'],
  ]) {
    await page.getByRole('button', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('main')).toBeVisible();
  }

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.getByRole('button', { name: 'FLAVORS STOCK' }).last().click();
  await expect(page).toHaveURL(/\/admin\/flavors$/);
  await expect(page.getByRole('main')).toBeVisible();
});
