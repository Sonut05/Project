import express from 'express';
import {
  createRequest,
  getIncomingRequests,
  getOutgoingRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  returnRequest
} from '../controllers/requests.controller.js';
import { createReview } from '../controllers/reviews.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/incoming', getIncomingRequests);
router.get('/outgoing', getOutgoingRequests);
router.patch('/:id/accept', acceptRequest);
router.patch('/:id/reject', rejectRequest);
router.patch('/:id/cancel', cancelRequest);
router.patch('/:id/return', returnRequest);
router.post('/:id/reviews', createReview);

export default router;
