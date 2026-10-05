import express from 'express';
import { safeUploadMiddleware, handleUpload } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, safeUploadMiddleware, handleUpload);

export default router;
