/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/Layout/AdminLayout';
// Auth Pages
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// Manager
import ManagerDashboard from './pages/manager/ManagerDashboard';

// Staff
import StaffPOS from './pages/staff/StaffPOS';
import StaffOrderOptions from './pages/staff/StaffOrderOptions';

function AppRoutes() {
  const { isAuthenticated, getRedirectPath } = useAuth();

  return (
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

      {/* Admin — header + keep-alive pages for instant revisits */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      {/* Manager */}
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

      {/* Staff */}
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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}