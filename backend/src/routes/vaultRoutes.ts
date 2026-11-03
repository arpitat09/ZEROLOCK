import { Router } from 'express';
import { VaultController } from '../controllers/vaultController';
import { authGuard } from '../middleware/authGuard';
import { validate } from '../middleware/validate';
import { vaultSetupSchema, vaultRotateSchema } from '../validators/vault';

const router = Router();

router.use(authGuard);

router.post('/setup', validate(vaultSetupSchema), VaultController.setup);
router.get('/metadata', VaultController.getMetadata);
router.put('/wrapped-key', validate(vaultRotateSchema), VaultController.rotateKey);
router.get('/recovery-status', VaultController.recoveryStatus);
router.post('/log-event', VaultController.logEvent);

export default router;
