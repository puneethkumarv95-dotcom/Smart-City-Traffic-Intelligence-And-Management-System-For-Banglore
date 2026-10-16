import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { ShieldAlert } from 'lucide-react';

export const RoleGuard = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-city-darkest flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-electric border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-mono text-slate-400">Verifying security clearances...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-city-darkest flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-city-card border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account role (<span className="text-rose-400 font-mono font-semibold uppercase">{user.role}</span>) does not possess authorization credentials to access this operations console.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => window.history.back()}
              className="w-full py-2.5 px-4 bg-city-surface hover:bg-city-hover text-white text-sm font-medium rounded-xl border border-city-border transition-colors"
            >
              Go Back
            </button>
            <a
              href={`/${user.role}`}
              className="w-full py-2.5 px-4 bg-electric hover:bg-electric-dark text-white text-sm font-medium rounded-xl transition-colors inline-block"
            >
              Return to Your Portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default RoleGuard;

