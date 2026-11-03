import { Router } from 'express';
import { SecurityController } from '../controllers/securityController';
import { authGuard } from '../middleware/authGuard';

const router = Router();

router.use(authGuard);

router.get('/sessions', SecurityController.getSessions);
router.delete('/sessions/:id', SecurityController.revokeSession);
router.get('/events', SecurityController.getSecurityEvents);

export default router;
