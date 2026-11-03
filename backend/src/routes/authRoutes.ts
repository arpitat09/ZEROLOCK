import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/authGuard';
import { registerSchema, loginSchema, changePasswordSchema } from '../validators/auth';

const router = Router();

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', authGuard, AuthController.logout);
router.get('/me', authGuard, AuthController.me);
router.post('/change-password', authGuard, validate(changePasswordSchema), AuthController.changePassword);

export default router;
