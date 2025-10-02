import { Router } from 'express';
import {
  getSplits,
  getSplitById,
  createSplit,
  updateSplit,
  deleteSplit,
} from '../controllers/splitsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getSplits);
router.post('/', createSplit);
router.get('/:id', getSplitById);
router.put('/:id', updateSplit);
router.delete('/:id', deleteSplit);

export default router;
