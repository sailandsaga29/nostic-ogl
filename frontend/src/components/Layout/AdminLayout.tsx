import { Suspense, lazy, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Header from './Header';
import type { AdminPageProps } from '../../types/adminPage';

const AdminDashboard = lazy(() => import('../../pages/admin/AdminDashboard'));
const FlavorsPage = lazy(() => import('../../pages/admin/FlavorsPage'));
const ExpensesPage = lazy(() => import('../../pages/admin/ExpensesPage'));
const AccountsPage = lazy(() => import('../../pages/admin/AccountsPage'));
const OrdersPage = lazy(() => import('../../pages/admin/OrdersPage'));
const Profile = lazy(() => import('../../pages/admin/Profile'));

const ADMIN_PAGES = [
  { path: '/admin/dashboard', Component: AdminDashboard },
  { path: '/admin/flavors', Component: FlavorsPage },
  { path: '/admin/inventory', Component: ExpensesPage },
  { path: '/admin/accounts', Component: AccountsPage },
  { path: '/admin/orders', Component: OrdersPage },
  { path: '/admin/profile', Component: Profile },
] as const;

function AdminPageFallback() {
  return (
    <div className="flex items-center justify-center px-4 py-24 text-slate-600">
      Loading page…
    </div>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [visitedPaths, setVisitedPaths] = useState<Set<string>>(
    () => new Set([pathname]),
  );

  useEffect(() => {
    setVisitedPaths((current) => {
      if (current.has(pathname)) {
        return current;
      }
      const next = new Set(current);
      next.add(pathname);
      return next;
    });
  }, [pathname]);

  if (pathname === '/admin' || pathname === '/admin/') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const isKnownRoute = ADMIN_PAGES.some((page) => page.path === pathname);
  if (!isKnownRoute) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br to-indigo-50">
      <Header />
      {ADMIN_PAGES.map(({ path, Component }) => {
        if (!visitedPaths.has(path)) {
          return null;
        }

        const isActive = pathname === path;

        return (
          <div
            key={path}
            className={isActive ? 'block' : 'hidden'}
            aria-hidden={!isActive}
          >
            <Suspense fallback={<AdminPageFallback />}>
              <Component isActive={isActive} />
            </Suspense>
          </div>
        );
      })}
    </div>
  );
}

export type { AdminPageProps };
