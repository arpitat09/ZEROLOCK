import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { VaultProvider } from './context/VaultContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { VaultUnlockPage } from './pages/VaultUnlockPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotesPage } from './pages/NotesPage';
import { NoteEditorPage } from './pages/NoteEditorPage';
import { AttachmentsPage } from './pages/AttachmentsPage';
import { SecurityCenterPage } from './pages/SecurityCenterPage';
import { RecoveryCenterPage } from './pages/RecoveryCenterPage';
import { SettingsPage } from './pages/SettingsPage';
import { CryptoLabPage } from './pages/CryptoLabPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <VaultProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unlock" element={<VaultUnlockPage />} />

                {/* Authenticated Application Layout */}
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/notes" element={<NotesPage />} />
                  <Route path="/notes/new" element={<NoteEditorPage />} />
                  <Route path="/notes/:id" element={<NoteEditorPage />} />
                  <Route path="/attachments" element={<AttachmentsPage />} />
                  <Route path="/security" element={<SecurityCenterPage />} />
                  <Route path="/recovery" element={<RecoveryCenterPage />} />
                  <Route path="/crypto-lab" element={<CryptoLabPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </VaultProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
