import { Router } from 'express';
import authRoutes from './authRoutes';
import vaultRoutes from './vaultRoutes';
import noteRoutes from './noteRoutes';
import attachmentRoutes from './attachmentRoutes';
import securityRoutes from './securityRoutes';
import backupRoutes from './backupRoutes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ZEROLOCK Zero-Knowledge Backend',
    timestamp: new Date().toISOString(),
    zeroKnowledgeVerified: true,
  });
});

router.use('/auth', authRoutes);
router.use('/vault', vaultRoutes);
router.use('/notes', noteRoutes);
router.use('/attachments', attachmentRoutes);
router.use('/security', securityRoutes);
router.use('/backups', backupRoutes);

export default router;
