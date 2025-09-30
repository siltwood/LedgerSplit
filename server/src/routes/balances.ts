import { Router } from 'express';
import {
  getUserBalance,
  getBalanceBetween,
  getGroupBalances,
} from '../controllers/balancesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/user/:userId', getUserBalance);
router.get('/between/:userId1/:userId2', getBalanceBetween);
router.get('/group/:groupId', getGroupBalances);

export default router;