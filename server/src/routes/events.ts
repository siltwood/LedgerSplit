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
} from '../controllers/eventsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public route to get event details by share token
router.get('/join/:token', getEventByShareToken);

// All routes below require authentication
router.use(requireAuth);

router.get('/', getEvents);
router.post('/', createEvent);
router.post('/join/:token', joinEventByShareToken);
router.get('/:id', getEventById);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.delete('/:id/participants/:userId', removeParticipant);

export default router;
