import express from 'express';
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage
} from '../controllers/messages.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getConversations);
router.post('/', getOrCreateConversation);
router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

export default router;
