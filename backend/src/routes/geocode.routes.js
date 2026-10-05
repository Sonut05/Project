import express from 'express';
import { geocodeAddress, reverseGeocodeAddress } from '../controllers/geocode.controller.js';

const router = express.Router();

router.get('/', geocodeAddress);
router.get('/reverse', reverseGeocodeAddress);

export default router;
