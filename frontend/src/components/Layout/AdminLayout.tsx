import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import FlavorsPage from '../../pages/admin/FlavorsPage';
import InventoryPage from '../../pages/admin/InventoryPage';
import OrdersPage from '../../pages/admin/OrdersPage';
import Profile from '../../pages/admin/Profile';

const ADMIN_PAGES = [
  { path: '/admin/dashboard', Component: AdminDashboard },
  { path: '/admin/flavors', Component: FlavorsPage },
  { path: '/admin/inventory', Component: InventoryPage },
  { path: '/admin/orders', Component: OrdersPage },
  { path: '/admin/profile', Component: Profile },
] as const;

export default function AdminLayout() {
  const { pathname } = useLocation();
  // Always mount dashboard so its data fetch runs on first admin visit (keep-alive).
  const [visitedPaths, setVisitedPaths] = useState<Set<string>>(
    () => new Set(['/admin/dashboard', pathname]),
  );

  useEffect(() => {
    setVisitedPaths((prev) => {
      if (prev.has(pathname)) {
        return prev;
      }
      const next = new Set(prev);
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
    <>
      {ADMIN_PAGES.map(({ path, Component }) => {
        if (!visitedPaths.has(path)) {
          return null;
        }

        return (
          <div key={path} hidden={pathname !== path}>
            <Component />
          </div>
        );
      })}
    </>
  );
}
