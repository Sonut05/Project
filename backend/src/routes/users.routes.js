import express from 'express';
import {
  getUserProfile,
  getUserListings,
  getUserReviews,
  updateMe
} from '../controllers/users.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.patch('/me', authenticate, updateMe);
router.get('/:id', optionalAuth, getUserProfile);
router.get('/:id/listings', getUserListings);
router.get('/:id/reviews', getUserReviews);

export default router;
