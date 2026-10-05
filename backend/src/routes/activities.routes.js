import express from 'express';
import {
  getActivities,
  deleteActivity
} from '../controllers/activities.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getActivities);
router.delete('/:id', deleteActivity);

export default router;
