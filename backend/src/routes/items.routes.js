import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} from '../controllers/items.controller.js';
import { getItemReviews } from '../controllers/reviews.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getItems);
router.get('/:id', optionalAuth, getItemById);
router.get('/:id/reviews', getItemReviews);
router.post('/', authenticate, createItem);
router.patch('/:id', authenticate, updateItem);
router.delete('/:id', authenticate, deleteItem);

export default router;
