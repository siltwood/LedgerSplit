import { Router } from 'express';
import {
  getFriends,
  getPendingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  blockFriend,
  unblockFriend,
  removeFriend,
} from '../controllers/friendsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getFriends);
router.get('/pending', getPendingRequests);
router.post('/invite', sendFriendRequest);
router.put('/:id/accept', acceptFriendRequest);
router.put('/:id/block', blockFriend);
router.put('/:id/unblock', unblockFriend);
router.delete('/:id', removeFriend);

export default router;