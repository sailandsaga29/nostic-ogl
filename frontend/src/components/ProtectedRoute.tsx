import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { ReactNode } from 'react';
import type { Role } from '../types';

interface Props {
  children: ReactNode;
  allowedRoles: Role[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: Props) {
  const {
    user,
    isAuthenticated,
    isLoading,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return <>{children}</>;
}