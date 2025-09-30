import { Router } from 'express';
import {
  getSettlements,
  createSettlement,
} from '../controllers/settlementsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getSettlements);
router.post('/', createSettlement);

export default router;