import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

router.post('/', BackupController.createBackup);
router.get('/', BackupController.getBackups);
router.get('/:id', BackupController.downloadBackup);
router.delete('/:id', BackupController.deleteBackup);

export default router;
