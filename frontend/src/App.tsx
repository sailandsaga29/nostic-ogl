/* eslint-disable @typescript-eslint/no-unused-vars */
import { Suspense, lazy } from 'react';
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

const AdminLayout = lazy(() => import('./components/Layout/AdminLayout'));
const Login = lazy(() => import('./pages/Login'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const ManagerDashboard = lazy(() => import('./pages/manager/ManagerDashboard'));
const StaffPOS = lazy(() => import('./pages/staff/StaffPOS'));
const StaffOrderOptions = lazy(() => import('./pages/staff/StaffOrderOptions'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] text-slate-600">
      Loading…
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, getRedirectPath } = useAuth();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={getRedirectPath()} replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to={getRedirectPath()} replace />
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={['super_admin', 'manager']}
            >
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff/pos"
          element={
            <ProtectedRoute
              allowedRoles={[
                'super_admin',
                'admin',
                'manager',
                'staff',
              ]}
            >
              <StaffPOS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/orders"
          element={
            <ProtectedRoute
              allowedRoles={[
                'super_admin',
                'admin',
                'manager',
                'staff',
              ]}
            >
              <StaffOrderOptions />
            </ProtectedRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
