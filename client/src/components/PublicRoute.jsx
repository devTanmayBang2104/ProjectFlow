import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useProfile } from '../hooks/useAuth';

const PublicRoute = () => {
  const { data: user, isLoading } = useProfile();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
