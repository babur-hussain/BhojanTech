import { Router } from 'express';
import { chatStream, getInsights, generateMenuSuggestionsHandler } from '../controllers/aiController';

const router: import('express').Router = Router();

router.post('/chat', chatStream);
router.get('/insights', getInsights);
router.post('/menu-suggestions', generateMenuSuggestionsHandler);

export default router;
