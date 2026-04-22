import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
    listCampaigns,
    createCampaign,
    previewCampaignAudience,
    sendCampaign,
    getCampaignStats,
} from '../controllers/campaign.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.get('/:id/preview', previewCampaignAudience);
router.post('/:id/send', sendCampaign);
router.get('/:id/stats', getCampaignStats);

export default router;
