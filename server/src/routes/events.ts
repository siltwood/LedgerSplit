import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventByShareToken,
  joinEventByShareToken,
  removeParticipant,
  inviteToEvent,
  getMyInvites,
  acceptInvite,
  declineInvite,
  acceptInviteByToken,
} from '../controllers/eventsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public routes (no auth required)
router.get('/join/:token', getEventByShareToken);

// All routes below require authentication
router.use(requireAuth);

router.get('/', getEvents);
router.post('/', createEvent);
router.post('/join/:token', joinEventByShareToken);
router.get('/invites', getMyInvites);
router.post('/invites/:id/accept', acceptInvite);
router.post('/invites/:id/decline', declineInvite);
router.post('/invites/token/:token/accept', acceptInviteByToken);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/invite', inviteToEvent);
router.delete('/:id/participants/:userId', removeParticipant);

export default router;
