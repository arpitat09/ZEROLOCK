import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ShieldAlert, Lock, Unlock, LogOut, Terminal } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVault } from '../../context/VaultContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isUnlocked, lock } = useVault();
  const navigate = useNavigate();

  const handleLogout = async () => {
    lock();
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-border-dark bg-bg-secondary/70 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary group-hover:scale-105 transition-transform shadow-glow-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-lg text-txt-main tracking-wider">ZEROLOCK</span>
            <span className="text-[10px] block font-mono text-accent-secondary uppercase tracking-widest -mt-1">
              Zero-Knowledge Vault
            </span>
          </div>
        </Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* VTU Cryptography Lab Shortcut */}
        <Link to="/crypto-lab">
          <Button variant="outline" size="sm" icon={<Terminal className="w-3.5 h-3.5" />}>
            Crypto Lab
          </Button>
        </Link>

        {/* Vault Status Indicator */}
        {isUnlocked ? (
          <div className="flex items-center gap-2">
            <Badge variant="success" dot size="md">
              Vault Unlocked (AES-256 in RAM)
            </Badge>
            <Button
              variant="secondary"
              size="sm"
              icon={<Lock className="w-3.5 h-3.5 text-status-warning" />}
              onClick={lock}
              title="Lock vault immediately to wipe keys from RAM"
            >
              Lock Vault
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="warning" dot size="md">
              Vault Locked (Zero Plaintext)
            </Badge>
            <Button
              variant="primary"
              size="sm"
              icon={<Unlock className="w-3.5 h-3.5" />}
              onClick={() => navigate('/unlock')}
            >
              Unlock Vault
            </Button>
          </div>
        )}

        {/* User Info & Logout */}
        <div className="h-5 w-px bg-border-dark mx-1" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-txt-main">{user?.name}</p>
            <p className="text-[10px] text-txt-muted font-mono truncate max-w-[150px]">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            title="Log out session"
            icon={<LogOut className="w-4 h-4 text-txt-muted hover:text-status-error" />}
          >
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
