import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { AttachmentController } from '../controllers/attachmentController';
import { authGuard } from '../middleware/authGuard';
import { config } from '../config';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const randomHex = crypto.randomBytes(16).toString('hex');
    cb(null, `enc_${Date.now()}_${randomHex}.enc`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB encrypted limit
  },
});

const router = Router();

router.use(authGuard);

router.post('/', upload.single('file'), AttachmentController.upload);
router.get('/', AttachmentController.getAttachments);
router.get('/:id/download', AttachmentController.download);
router.delete('/:id', AttachmentController.deleteAttachment);

export default router;
