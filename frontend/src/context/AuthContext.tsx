import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDTO } from '@zerolock/shared';
import { api } from '../services/api';

interface AuthContextType {
  user: UserDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVaultConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  setVaultConfigured: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isVaultConfigured, setIsVaultConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setIsVaultConfigured(data.vaultStatus?.isConfigured ?? false);
    } catch {
      setUser(null);
      setIsVaultConfigured(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setIsVaultConfigured(res.vaultStatus.isConfigured);
    if (res.token) {
      api.setToken(res.token);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    setUser(res.user);
    setIsVaultConfigured(false);
    if (res.token) {
      api.setToken(res.token);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsVaultConfigured(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isVaultConfigured,
        login,
        register,
        logout,
        refreshAuth,
        setVaultConfigured: setIsVaultConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
