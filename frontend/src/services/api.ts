import {
  AuthResponse,
  VaultMetadataDTO,
  VaultSetupRequest,
  VaultRotateKeyRequest,
  EncryptedNoteDTO,
  CreateEncryptedNoteRequest,
  UpdateEncryptedNoteRequest,
  EncryptedAttachmentDTO,
  SessionDTO,
  SecurityEventDTO,
  EncryptedBackupBundle,
  ApiResponse,
} from '@zerolock/shared';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  public setToken(token: string | null) {
    this.token = token;
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Include HttpOnly cookies
    });

    const data: ApiResponse<T> = await response.json().catch(() => ({
      success: false,
      error: 'Failed to parse JSON response',
    }));

    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}: Request failed`);
    }

    return data.data as T;
  }

  // Auth Endpoints
  public async register(payload: { name: string; email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.token = null;
  }

  public async getMe(): Promise<{ user: any; vaultStatus: any }> {
    return this.request<{ user: any; vaultStatus: any }>('/auth/me');
  }

  public async changeAccountPassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Vault Endpoints
  public async setupVault(payload: VaultSetupRequest): Promise<VaultMetadataDTO> {
    return this.request<VaultMetadataDTO>('/vault/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getVaultMetadata(): Promise<VaultMetadataDTO> {
    return this.request<VaultMetadataDTO>('/vault/metadata');
  }

  public async rotateVaultKey(payload: VaultRotateKeyRequest): Promise<{ vaultVersion: number; updatedAt: string }> {
    return this.request<{ vaultVersion: number; updatedAt: string }>('/vault/wrapped-key', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async getRecoveryStatus(): Promise<{ hasRecoveryKey: boolean; vaultVersion: number }> {
    return this.request<{ hasRecoveryKey: boolean; vaultVersion: number }>('/vault/recovery-status');
  }

  public async logVaultEvent(payload: { eventType: string; status?: string; details?: string }): Promise<void> {
    return this.request('/vault/log-event', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Note Endpoints (All Encrypted)
  public async getNotes(filter?: { archived?: boolean; favorite?: boolean; pinned?: boolean }): Promise<EncryptedNoteDTO[]> {
    const params = new URLSearchParams();
    if (filter?.archived !== undefined) params.append('archived', String(filter.archived));
    if (filter?.favorite !== undefined) params.append('favorite', String(filter.favorite));
    if (filter?.pinned !== undefined) params.append('pinned', String(filter.pinned));

    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<EncryptedNoteDTO[]>(`/notes${qs}`);
  }

  public async getNoteById(id: string): Promise<EncryptedNoteDTO> {
    return this.request<EncryptedNoteDTO>(`/notes/${id}`);
  }

  public async createNote(payload: CreateEncryptedNoteRequest): Promise<EncryptedNoteDTO> {
    return this.request<EncryptedNoteDTO>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async updateNote(id: string, payload: UpdateEncryptedNoteRequest): Promise<EncryptedNoteDTO> {
    return this.request<EncryptedNoteDTO>(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async deleteNote(id: string): Promise<void> {
    return this.request(`/notes/${id}`, { method: 'DELETE' });
  }

  // Encrypted Attachment Endpoints
  public async uploadAttachment(formData: FormData): Promise<EncryptedAttachmentDTO> {
    return this.request<EncryptedAttachmentDTO>('/attachments', {
      method: 'POST',
      body: formData,
    });
  }

  public async getAttachments(noteId?: string): Promise<EncryptedAttachmentDTO[]> {
    const qs = noteId ? `?noteId=${noteId}` : '';
    return this.request<EncryptedAttachmentDTO[]>(`/attachments${qs}`);
  }

  public async downloadAttachmentBlob(id: string): Promise<{
    blob: Blob;
    encryptedFileKey: string;
    fileKeyIv: string;
    fileIv: string;
    encryptedFileName: string;
    fileNameIv: string;
    mimeType: string;
  }> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}/attachments/${id}/download`, {
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error(`Failed to download encrypted attachment: ${res.statusText}`);
    }

    const blob = await res.blob();
    return {
      blob,
      encryptedFileKey: res.headers.get('X-Encrypted-File-Key') || '',
      fileKeyIv: res.headers.get('X-File-Key-Iv') || '',
      fileIv: res.headers.get('X-File-Iv') || '',
      encryptedFileName: res.headers.get('X-Encrypted-File-Name') || '',
      fileNameIv: res.headers.get('X-File-Name-Iv') || '',
      mimeType: res.headers.get('X-Mime-Type') || 'application/octet-stream',
    };
  }

  public async deleteAttachment(id: string): Promise<void> {
    return this.request(`/attachments/${id}`, { method: 'DELETE' });
  }

  // Security & Audit Endpoints
  public async getSessions(): Promise<SessionDTO[]> {
    return this.request<SessionDTO[]>('/security/sessions');
  }

  public async revokeSession(id: string): Promise<void> {
    return this.request(`/security/sessions/${id}`, { method: 'DELETE' });
  }

  public async getSecurityEvents(): Promise<SecurityEventDTO[]> {
    return this.request<SecurityEventDTO[]>('/security/events');
  }

  // Backup Endpoints
  public async createBackup(bundle: EncryptedBackupBundle): Promise<{ id: string; checksumSha256: string }> {
    return this.request<{ id: string; checksumSha256: string }>('/backups', {
      method: 'POST',
      body: JSON.stringify({ bundle }),
    });
  }

  public async getBackups(): Promise<any[]> {
    return this.request<any[]>('/backups');
  }

  public async downloadBackup(id: string): Promise<EncryptedBackupBundle> {
    return this.request<EncryptedBackupBundle>(`/backups/${id}`);
  }

  public async deleteBackup(id: string): Promise<void> {
    return this.request(`/backups/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
