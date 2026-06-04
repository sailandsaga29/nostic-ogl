import { Navigate, useLocation } from 'react-router-dom';
import Header from './Header';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import FlavorsPage from '../../pages/admin/FlavorsPage';
import ExpensesPage from '../../pages/admin/ExpensesPage';
import OrdersPage from '../../pages/admin/OrdersPage';
import Profile from '../../pages/admin/Profile';

const ADMIN_PAGES = [
  { path: '/admin/dashboard', Component: AdminDashboard },
  { path: '/admin/flavors', Component: FlavorsPage },
  { path: '/admin/inventory', Component: ExpensesPage },
  { path: '/admin/orders', Component: OrdersPage },
  { path: '/admin/profile', Component: Profile },
] as const;

export default function AdminLayout() {
  const { pathname } = useLocation();

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
      {ADMIN_PAGES.map(({ path, Component }) => (
        <div
          key={path}
          className={pathname === path ? 'block' : 'hidden'}
          aria-hidden={pathname !== path}
        >
          <Component />
        </div>
      ))}
    </div>
  );
}
