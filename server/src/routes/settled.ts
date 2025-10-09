import { Router } from 'express';
import {
  toggleSettledConfirmation,
  getSettledConfirmations,
} from '../controllers/settledController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/events/:eventId/settled/toggle', toggleSettledConfirmation);
router.get('/events/:eventId/settled', getSettledConfirmations);

export default router;
