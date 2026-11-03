import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login(email, password);
      // Account identity verified -> redirect to unlock vault or destination
      navigate('/unlock', { state: { redirectTo: from } });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-6 selection:bg-accent-primary/20 selection:text-accent-primary">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/30 flex items-center justify-center text-accent-primary group-hover:scale-105 transition-transform shadow-glow-primary">
              <Shield className="w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-txt-main">
            Authenticate Account
          </h1>
          <p className="text-xs md:text-sm text-txt-secondary mt-1.5">
            Log in to verify your account session. Decryption occurs separately using your local Master Password.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Account Email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <Input
              label="Account Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-txt-main"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between text-xs text-txt-muted mt-1">
              <span>Zero-Knowledge Authentication</span>
              <span className="text-[11px] font-mono text-accent-secondary">Session JWT</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-3"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Account
            </Button>

            <div className="text-center text-xs text-txt-muted mt-4 pt-4 border-t border-border-dark flex flex-col gap-2">
              <p>
                Don't have a vault yet?{' '}
                <Link to="/register" className="text-accent-primary hover:underline font-semibold">
                  Create Account
                </Link>
              </p>
              <Link to="/crypto-lab" className="text-[11px] font-mono text-txt-secondary hover:text-accent-secondary">
                Explore Cryptography Lab without logging in →
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
