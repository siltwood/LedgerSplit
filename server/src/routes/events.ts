import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  inviteToEvent,
  getMyInvites,
  acceptInvite,
  acceptInviteByToken,
  declineInvite,
  removeParticipant,
} from '../controllers/eventsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(requireAuth);

router.get('/', getEvents);
router.post('/', createEvent);
router.get('/invites', getMyInvites);
router.post('/invites/token/:token/accept', acceptInviteByToken);
router.post('/invites/:id/accept', acceptInvite);
router.post('/invites/:id/decline', declineInvite);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/invite', inviteToEvent);
router.delete('/:id/participants/:userId', removeParticipant);

export default router;
