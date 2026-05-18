import { Router } from 'express';
import { createBooking, getBookings, updateBookingStatus, assignTable, deleteBooking } from '../controllers/bookingController';
import { requireAuth } from '../middleware/auth.middleware';

const router: Router = Router();

router.use(requireAuth);

router.post('/', createBooking);
router.get('/', getBookings);
router.patch('/:id/status', updateBookingStatus);
router.patch('/:id/assign-table', assignTable);
router.delete('/:id', deleteBooking);

export default router;
