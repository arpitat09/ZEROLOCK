import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Paperclip,
  ShieldCheck,
  KeyRound,
  Terminal,
  Settings,
  LayoutDashboard,
  Lock,
  Pin,
  Star,
  Archive,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useVault } from '../../context/VaultContext';

export const Sidebar: React.FC = () => {
  const { isUnlocked } = useVault();
  const navigate = useNavigate();

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/notes', label: 'All Notes', icon: FileText },
    { to: '/notes?pinned=true', label: 'Pinned Notes', icon: Pin },
    { to: '/notes?favorite=true', label: 'Favorites', icon: Star },
    { to: '/notes?archived=true', label: 'Archive', icon: Archive },
    { to: '/attachments', label: 'Attachments', icon: Paperclip },
    { to: '/security', label: 'Security Center', icon: ShieldCheck },
    { to: '/recovery', label: 'Recovery Center', icon: KeyRound },
    { to: '/crypto-lab', label: 'Cryptography Lab', icon: Terminal, highlight: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-border-dark bg-bg-secondary/40 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)]">
      <div className="p-4 flex flex-col gap-4">
        {/* Quick Create Note */}
        <Button
          variant="primary"
          className="w-full justify-center"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (!isUnlocked) {
              navigate('/unlock');
            } else {
              navigate('/notes/new');
            }
          }}
        >
          New Encrypted Note
        </Button>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20'
                      : item.highlight
                      ? 'text-accent-secondary hover:bg-bg-hover border border-accent-secondary/20'
                      : 'text-txt-secondary hover:text-txt-main hover:bg-bg-hover'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-accent-secondary/20 text-accent-secondary font-semibold">
                    VTU
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border-dark flex flex-col gap-2">
        <div className="bg-bg-card rounded-lg p-3 border border-border-dark flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-status-success animate-pulse shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-txt-main font-medium">Envelope Encryption</span>
            <span className="text-[10px] font-mono text-txt-muted">Argon2id + AES-256-GCM</span>
          </div>
        </div>
        <p className="text-[10px] text-center text-txt-muted font-mono">
          VTU 7th Sem Final Year Project
        </p>
      </div>
    </aside>
  );
};
