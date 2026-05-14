import { Router } from 'express';
import { chatStream, getInsights, generateMenuSuggestionsHandler, getConversationsList, getConversationMessagesHandler } from '../controllers/aiController';

const router: import('express').Router = Router();

router.post('/chat', chatStream);
router.get('/chat/sessions', getConversationsList);
router.get('/chat/sessions/:sessionId', getConversationMessagesHandler);
router.get('/insights', getInsights);
router.post('/menu-suggestions', generateMenuSuggestionsHandler);

export default router;
