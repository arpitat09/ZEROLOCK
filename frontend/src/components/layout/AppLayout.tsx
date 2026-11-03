import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { AlertTriangle, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const { isAuthenticated, isLoading, isVaultConfigured } = useAuth();
  const { isUnlocked } = useVault();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-main flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-txt-muted font-mono">Authenticating secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-bg-main flex flex-col text-txt-main">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto bg-bg-main/50 relative flex flex-col">
          {/* Vault locked notification banner if viewing notes while locked */}
          {!isUnlocked && isVaultConfigured && location.pathname.startsWith('/notes') && (
            <div className="bg-status-warning/10 border-b border-status-warning/20 px-6 py-3 flex items-center justify-between text-xs text-status-warning">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Vault is locked. Note contents and titles cannot be decrypted without your master password.</span>
              </div>
              <Link
                to="/unlock"
                className="font-semibold underline hover:text-txt-main transition-colors ml-4"
              >
                Unlock Vault Now
              </Link>
            </div>
          )}

          <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
