import { Router } from 'express';
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  inviteToGroup,
  getMyInvites,
  acceptInvite,
  declineInvite,
  removeMember,
} from '../controllers/groupsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/invites', getMyInvites);
router.get('/:id', getGroupById);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/invite', inviteToGroup);
router.post('/invites/:inviteId/accept', acceptInvite);
router.post('/invites/:inviteId/decline', declineInvite);
router.delete('/:id/members/:userId', removeMember);

export default router;