import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { isValidUUID } from '../utils/validation';

// Toggle user's settled confirmation for an event
export const toggleSettledConfirmation = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    // Validate eventId as UUID
    if (!isValidUUID(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if user is participant
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Check if user already confirmed
    const { data: existing } = await db
      .from('event_settled_confirmations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Remove confirmation
      await db
        .from('event_settled_confirmations')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      // Update event is_settled to false when someone unconfirms
      await db
        .from('events')
        .update({ is_settled: false })
        .eq('event_id', eventId);

      return res.json({ confirmed: false });
    } else {
      // Add confirmation
      await db
        .from('event_settled_confirmations')
        .insert({
          event_id: eventId,
          user_id: userId
        });

      // Check if all participants have now confirmed
      const { data: allParticipants } = await db
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId);

      const { data: allConfirmations } = await db
        .from('event_settled_confirmations')
        .select('user_id')
        .eq('event_id', eventId);

      const participantCount = allParticipants?.length || 0;
      const confirmationCount = allConfirmations?.length || 0;

      // If all participants have confirmed, mark event as settled
      if (participantCount > 0 && participantCount === confirmationCount) {
        await db
          .from('events')
          .update({ is_settled: true })
          .eq('event_id', eventId);
      }

      return res.json({ confirmed: true });
    }
  } catch (error) {
    console.error('Toggle settled confirmation error:', error);
    res.status(500).json({ error: 'Failed to update settled confirmation' });
  }
};

// Get settled confirmations for an event
export const getSettledConfirmations = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    // Validate eventId as UUID
    if (!isValidUUID(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }

    // Check if user is participant
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Get all confirmations
    const { data: confirmations } = await db
      .from('event_settled_confirmations')
      .select('user_id')
      .eq('event_id', eventId);

    res.json({ confirmations: confirmations || [] });
  } catch (error) {
    console.error('Get settled confirmations error:', error);
    res.status(500).json({ error: 'Failed to fetch settled confirmations' });
  }
};
