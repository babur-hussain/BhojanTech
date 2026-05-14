import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
    lookupCustomerByPhone,
    listCustomers,
    getCustomerDetail,
    updateCustomer,
    getSegmentSummary,
    getBirthdayList,
    customerAnalytics,
} from '../controllers/customer.controller';

const router: Router = Router();
router.use(requireAuth);

router.get('/lookup/:phone', lookupCustomerByPhone);
router.get('/analytics', customerAnalytics);
router.get('/segments/summary', getSegmentSummary);
router.get('/birthdays/this-month', getBirthdayList);
router.get('/', listCustomers);
router.get('/:id', getCustomerDetail);
router.put('/:id', updateCustomer);

export default router;
