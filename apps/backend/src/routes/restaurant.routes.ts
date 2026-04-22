import { Router } from 'express';
import { createRestaurant } from '../controllers/restaurant.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router: import('express').Router = Router();

router.post('/', requireAuth, createRestaurant);

export default router;
