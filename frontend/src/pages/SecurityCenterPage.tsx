import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Laptop,
  Smartphone,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Cpu,
  Key,
  Globe,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { SessionDTO, SecurityEventDTO } from '@zerolock/shared';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const SecurityCenterPage: React.FC = () => {
  const { user } = useAuth();
  const { vaultMetadata, isUnlocked } = useVault();
  const { success, error } = useToast();

  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [events, setEvents] = useState<SecurityEventDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSecurityData = async () => {
    try {
      setIsLoading(true);
      const [sessionsData, eventsData] = await Promise.all([
        api.getSessions(),
        api.getSecurityEvents(),
      ]);
      setSessions(sessionsData);
      setEvents(eventsData);
    } catch (err: any) {
      error(err.message || 'Failed to load security center data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const handleRevokeSession = async (id: string) => {
    if (confirm('Revoke this active session? The associated device will be logged out.')) {
      try {
        await api.revokeSession(id);
        setSessions((prev) => prev.filter((s) => s.id !== id));
        success('Session revoked successfully.');
      } catch (err: any) {
        error(err.message || 'Failed to revoke session');
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-16 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
          Security Center & Threat Monitoring
        </h1>
        <p className="text-xs md:text-sm text-txt-secondary mt-1">
          Monitor authenticated browser sessions, cryptographic parameters, and audit event telemetry.
        </p>
      </div>

      {/* Cryptographic Parameters Inspection */}
      <Card className="border-accent-primary/30">
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-accent-primary" />
            <CardTitle>Vault Cryptographic Parameters (Zero-Knowledge Audit)</CardTitle>
          </div>
          <Badge variant={isUnlocked ? 'success' : 'warning'} dot>
            {isUnlocked ? 'Key Active in RAM' : 'Vault Sealed'}
          </Badge>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-bg-secondary rounded-xl border border-border-dark flex flex-col gap-1.5">
            <span className="text-txt-muted text-[10px] uppercase tracking-wider">KDF Specification</span>
            <span className="text-txt-main font-bold">Argon2id (RFC 9106)</span>
            <div className="text-[11px] text-accent-secondary mt-1 flex flex-col gap-0.5">
              <span>• Memory Cost: {vaultMetadata?.kdfParameters.memoryCost || 19456} KiB (19 MB)</span>
              <span>• Time Iterations: {vaultMetadata?.kdfParameters.timeCost || 3}</span>
              <span>• Parallelism Lanes: {vaultMetadata?.kdfParameters.parallelism || 1}</span>
            </div>
          </div>

          <div className="p-3.5 bg-bg-secondary rounded-xl border border-border-dark flex flex-col gap-1.5">
            <span className="text-txt-muted text-[10px] uppercase tracking-wider">Symmetric Cipher Suite</span>
            <span className="text-txt-main font-bold">AES-256-GCM (NIST SP 800-38D)</span>
            <div className="text-[11px] text-status-success mt-1 flex flex-col gap-0.5">
              <span>• Key Length: 256 bits (32 bytes)</span>
              <span>• CSPRNG Nonce / IV: 96 bits (12 bytes)</span>
              <span>• GMAC Auth Tag: 128 bits (16 bytes)</span>
            </div>
          </div>

          <div className="p-3.5 bg-bg-secondary rounded-xl border border-border-dark flex flex-col gap-1.5">
            <span className="text-txt-muted text-[10px] uppercase tracking-wider">Public Salt (Base64)</span>
            <span className="text-txt-main font-bold truncate" title={vaultMetadata?.salt}>
              {vaultMetadata?.salt || 'Not initialized'}
            </span>
            <span className="text-[10px] text-txt-muted mt-1">
              Random 128-bit salt prevents rainbow table precomputation. Stored publicly per zero-knowledge design.
            </span>
          </div>
        </div>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-accent-secondary" />
            <CardTitle>Active Authenticated Sessions</CardTitle>
          </div>
          <Badge variant="cyan" size="sm">
            {sessions.length} Active
          </Badge>
        </CardHeader>

        <div className="divide-y divide-border-dark">
          {sessions.map((session) => (
            <div key={session.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-dark flex items-center justify-center text-accent-secondary shrink-0">
                  <Laptop className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-txt-main truncate max-w-xs sm:max-w-md">
                      {session.deviceInformation}
                    </p>
                    {session.isCurrent && (
                      <Badge variant="success" size="sm">
                        Current Device
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-txt-muted font-mono mt-0.5">
                    <span>IP: {session.ipAddress || '127.0.0.1'}</span>
                    <span>• Logged in: {new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {!session.isCurrent && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRevokeSession(session.id)}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Security Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-status-warning" />
            <CardTitle>Security Audit Event Log (Immutable Trail)</CardTitle>
          </div>
          <span className="text-xs text-txt-muted font-mono">Last 50 events</span>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-dark text-[10px] font-mono text-txt-muted uppercase">
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Device & IP</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark font-mono text-[11px]">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-bg-hover/50">
                  <td className="py-3 px-3 font-semibold text-txt-main">{evt.eventType}</td>
                  <td className="py-3 px-3 text-txt-muted">{new Date(evt.timestamp).toLocaleString()}</td>
                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        evt.status === 'SUCCESS'
                          ? 'success'
                          : evt.status === 'FAILURE'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {evt.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-txt-secondary truncate max-w-[200px]" title={evt.deviceInformation}>
                    {evt.ipAddress} • {evt.deviceInformation}
                  </td>
                  <td className="py-3 px-3 text-txt-muted">{evt.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
