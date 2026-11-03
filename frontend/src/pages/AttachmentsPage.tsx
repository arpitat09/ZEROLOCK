import React, { useState, useEffect, useRef } from 'react';
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  Lock,
  FileCheck,
  HardDrive,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useVault } from '../context/VaultContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { encryptBinaryFile, decryptBinaryFile } from '../crypto/envelope';
import { EncryptedAttachmentDTO } from '@zerolock/shared';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { arrayBufferToString, base64ToArrayBuffer } from '../crypto/utils';
import { decryptAesGcm } from '../crypto/webCrypto';
import { unwrapKey } from '../crypto/envelope';

interface DecryptedAttachmentMeta {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  raw: EncryptedAttachmentDTO;
}

export const AttachmentsPage: React.FC = () => {
  const { vaultKey, isUnlocked } = useVault();
  const { success, error, warning } = useToast();

  const [attachments, setAttachments] = useState<DecryptedAttachmentMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptProgress, setEncryptProgress] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAttachments = async () => {
    try {
      setIsLoading(true);
      const rawList = await api.getAttachments();

      if (vaultKey && isUnlocked) {
        const decryptedList: DecryptedAttachmentMeta[] = [];
        for (const item of rawList) {
          try {
            // Decrypt filename
            const fileDek = await unwrapKey(item.encryptedFileKey, vaultKey, item.fileKeyIv);
            const fileNameBytes = base64ToArrayBuffer(item.encryptedFileName);
            const fileNameIv = base64ToArrayBuffer(item.fileNameIv);
            const decryptedFileNameBytes = await decryptAesGcm(fileDek, fileNameBytes, fileNameIv);
            const fileName = arrayBufferToString(decryptedFileNameBytes);

            decryptedList.push({
              id: item.id,
              fileName,
              fileSize: item.fileSize,
              mimeType: item.mimeType,
              createdAt: item.createdAt,
              raw: item,
            });
          } catch (decErr) {
            console.error('Failed to decrypt attachment filename:', decErr);
            decryptedList.push({
              id: item.id,
              fileName: 'Encrypted File (Unwrap Failed)',
              fileSize: item.fileSize,
              mimeType: item.mimeType,
              createdAt: item.createdAt,
              raw: item,
            });
          }
        }
        setAttachments(decryptedList);
      } else {
        setAttachments(
          rawList.map((item) => ({
            id: item.id,
            fileName: 'Encrypted File (Vault Locked)',
            fileSize: item.fileSize,
            mimeType: item.mimeType,
            createdAt: item.createdAt,
            raw: item,
          }))
        );
      }
    } catch (err: any) {
      error(err.message || 'Failed to load attachments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [vaultKey, isUnlocked]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!vaultKey || !isUnlocked) {
      warning('Please unlock your vault before uploading attachments.');
      return;
    }

    try {
      setIsEncrypting(true);
      setEncryptProgress(`Reading ${file.name} into browser memory...`);
      const fileBytes = await file.arrayBuffer();

      setEncryptProgress('Generating fresh 256-bit AES-GCM File DEK and CSPRNG nonce...');
      const envelope = await encryptBinaryFile(vaultKey, fileBytes, file.name, file.type);

      setEncryptProgress('Uploading encrypted ciphertext blob to server...');
      const formData = new FormData();
      formData.append('file', envelope.encryptedFileBlob, 'encrypted.enc');
      formData.append('encryptedFileKey', envelope.encryptedFileKey);
      formData.append('fileKeyIv', envelope.fileKeyIv);
      formData.append('fileIv', envelope.fileIv);
      formData.append('encryptedFileName', envelope.encryptedFileName);
      formData.append('fileNameIv', envelope.fileNameIv);
      formData.append('mimeType', file.type || 'application/octet-stream');

      await api.uploadAttachment(formData);
      success(`"${file.name}" encrypted in browser and uploaded safely!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchAttachments();
    } catch (err: any) {
      error(err.message || 'Failed to encrypt and upload attachment');
    } finally {
      setIsEncrypting(false);
      setEncryptProgress('');
    }
  };

  const handleDownload = async (attachment: DecryptedAttachmentMeta) => {
    if (!vaultKey || !isUnlocked) {
      warning('Please unlock your vault to decrypt this file.');
      return;
    }

    try {
      setDownloadingId(attachment.id);
      const downloadData = await api.downloadAttachmentBlob(attachment.id);

      const encryptedBytes = await downloadData.blob.arrayBuffer();

      // Client-side decryption
      const { fileBlob, fileName } = await decryptBinaryFile(
        vaultKey,
        encryptedBytes,
        {
          encryptedFileKey: downloadData.encryptedFileKey,
          fileKeyIv: downloadData.fileKeyIv,
          fileIv: downloadData.fileIv,
          encryptedFileName: downloadData.encryptedFileName,
          fileNameIv: downloadData.fileNameIv,
        },
        downloadData.mimeType
      );

      // Trigger browser download
      const url = URL.createObjectURL(fileBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || attachment.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      success(`Decrypted and downloaded "${fileName || attachment.fileName}"!`);
    } catch (err: any) {
      error(err.message || 'Failed to download and decrypt file');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Permanently delete encrypted attachment "${name}"?`)) {
      try {
        await api.deleteAttachment(id);
        setAttachments((prev) => prev.filter((a) => a.id !== id));
        success('Attachment deleted.');
      } catch (err: any) {
        error(err.message || 'Failed to delete attachment');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-txt-main">
            Secure Encrypted Attachments
          </h1>
          <p className="text-xs text-txt-secondary mt-1">
            Files are converted to ciphertext using unique 256-bit AES-GCM keys before network upload.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            disabled={!isUnlocked || isEncrypting}
          />
          <Button
            variant="primary"
            size="md"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={!isUnlocked || isEncrypting}
          >
            Upload Encrypted File
          </Button>
        </div>
      </div>

      {/* Encryption Progress Banner */}
      {isEncrypting && (
        <Card className="p-4 border-accent-primary/40 bg-accent-primary/10 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-accent-primary animate-spin shrink-0" />
          <div className="text-xs font-mono text-accent-primary">
            <strong>Client-Side Authenticated Encryption:</strong> {encryptProgress}
          </div>
        </Card>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-border-dark">
          <Paperclip className="w-10 h-10 text-txt-muted mb-3" />
          <h3 className="font-heading font-bold text-base text-txt-main mb-1">
            No encrypted attachments
          </h3>
          <p className="text-xs text-txt-secondary max-w-sm mb-4">
            Upload images, PDFs, or confidential documents. Each file is secured with its own per-file DEK and authenticated nonce.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => fileInputRef.current?.click()}
            disabled={!isUnlocked}
          >
            Select File to Encrypt
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attachments.map((item) => (
            <Card key={item.id} hover className="flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={isUnlocked ? 'success' : 'warning'} size="sm" dot>
                    {isUnlocked ? 'AES-256 Encrypted' : 'Vault Locked'}
                  </Badge>
                  <span className="text-[11px] font-mono text-txt-muted">
                    {formatBytes(item.fileSize)}
                  </span>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-border-dark flex items-center justify-center text-accent-secondary shrink-0">
                    {item.mimeType.startsWith('image/') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm text-txt-main truncate mb-0.5" title={item.fileName}>
                      {item.fileName}
                    </h4>
                    <p className="text-[11px] font-mono text-txt-muted truncate">
                      MIME: {item.mimeType}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border-dark flex items-center justify-between">
                <span className="text-[10px] text-txt-muted font-mono">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={
                      downloadingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-accent-primary" />
                      )
                    }
                    onClick={() => handleDownload(item)}
                    disabled={!isUnlocked || downloadingId === item.id}
                  >
                    Decrypt
                  </Button>

                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.fileName)}
                    className="p-2 rounded-lg text-txt-muted hover:text-status-error hover:bg-bg-hover transition-colors"
                    title="Delete attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
