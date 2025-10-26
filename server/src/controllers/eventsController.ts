import { Response, Request } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all events for current user
export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: eventParticipants, error } = await db
      .from('event_participants')
      .select(`
        events (
          event_id,
          name,
          description,
          created_by,
          created_at,
          is_settled
        )
      `)
      .eq('user_id', userId)
      .is('events.deleted_at', null);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch events.' });
    }

    // Extract events from the nested structure
    const events = eventParticipants
      .map((ep: any) => ep.events)
      .filter(Boolean);

    // Get user preferences for these events
    const eventIds = events.map((e: any) => e.event_id);
    const { data: preferences } = await db
      .from('user_event_preferences')
      .select('event_id, is_dismissed')
      .eq('user_id', userId)
      .in('event_id', eventIds);

    // Get participants for all events
    const { data: allParticipants } = await db
      .from('event_participants')
      .select(`
        event_id,
        user_id,
        joined_at,
        users (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .in('event_id', eventIds);

    // Group participants by event_id
    const participantsMap = new Map<string, any[]>();
    allParticipants?.forEach((p: any) => {
      if (!participantsMap.has(p.event_id)) {
        participantsMap.set(p.event_id, []);
      }
      participantsMap.get(p.event_id)!.push({
        user_id: p.user_id,
        joined_at: p.joined_at,
        user: p.users
      });
    });

    // Get splits for all events
    const { data: allSplits } = await db
      .from('splits')
      .select(`
        split_id,
        event_id,
        description,
        amount,
        category,
        paid_by,
        created_at,
        split_participants (
          user_id,
          amount_owed
        )
      `)
      .in('event_id', eventIds)
      .is('deleted_at', null);

    // Group splits by event_id
    const splitsMap = new Map<string, any[]>();
    allSplits?.forEach((split: any) => {
      if (!splitsMap.has(split.event_id)) {
        splitsMap.set(split.event_id, []);
      }
      splitsMap.get(split.event_id)!.push({
        ...split,
        participants: split.split_participants
      });
    });

    // Merge preferences, participants, and splits into events
    const prefsMap = new Map(preferences?.map(p => [p.event_id, p.is_dismissed]) || []);
    const eventsWithData = events.map((event: any) => ({
      ...event,
      is_dismissed: prefsMap.get(event.event_id) || false,
      participants: participantsMap.get(event.event_id) || [],
      splits: splitsMap.get(event.event_id) || []
    }));

    res.json({ events: eventsWithData });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

// Get single event by ID with participants
export const getEventById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is participant of event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event.' });
    }

    // Get event details
    const { data: event, error } = await db
      .from('events')
      .select('*')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Get all participants
    const { data: participants } = await db
      .from('event_participants')
      .select(`
        user_id,
        joined_at,
        users (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', id);

    // Get settled confirmations
    const { data: settledConfirmations } = await db
      .from('event_settled_confirmations')
      .select('user_id, confirmed_at')
      .eq('event_id', id);

    res.json({ event, participants, settled_confirmations: settledConfirmations || [] });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
};

// Create new event
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, participant_ids = [] } = req.body;
    const userId = req.user?.id;

    // Import validation utilities
    const { sanitizeText, isValidUUID } = await import('../utils/validation');

    if (!name) {
      return res.status(400).json({ error: 'Event name is required.' });
    }

    // Validate and sanitize name (max 20 characters)
    const nameValidation = sanitizeText(name, 20);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Validate and sanitize description
    const descriptionValidation = sanitizeText(description || '', 1000);
    if (!descriptionValidation.valid) {
      return res.status(400).json({ error: descriptionValidation.error });
    }

    // Validate participant IDs - only allow UUIDs, no arbitrary additions
    const validParticipantIds: string[] = [];
    if (participant_ids && participant_ids.length > 0) {
      for (const id of participant_ids) {
        if (!isValidUUID(id)) {
          return res.status(400).json({ error: 'Invalid participant ID format.' });
        }

        // Verify participant exists and is not the creator
        if (id !== userId) {
          const { data: participant } = await db
            .from('users')
            .select('user_id')
            .eq('user_id', id)
            .single();

          if (participant) {
            validParticipantIds.push(id);
          }
        }
      }
    }

    // Create event
    const { data: event, error: eventError } = await db
      .from('events')
      .insert({
        name: nameValidation.sanitized,
        description: descriptionValidation.sanitized,
        created_by: userId,
      })
      .select()
      .single();

    if (eventError) {
      console.error('Database error:', eventError);
      return res.status(500).json({ error: 'Failed to create event.' });
    }

    // Add creator and verified participants
    const participantsToAdd: string[] = [userId!, ...validParticipantIds];

    const participantRecords = participantsToAdd.map((participantId: string) => ({
      event_id: event.event_id,
      user_id: participantId,
    }));

    const { error: participantError } = await db
      .from('event_participants')
      .insert(participantRecords);

    if (participantError) {
      console.error('Database error:', participantError);
      return res.status(500).json({ error: 'Failed to add participants.' });
    }

    // Get participants with user details
    const { data: participants } = await db
      .from('event_participants')
      .select(`
        user_id,
        joined_at,
        users (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', event.event_id);

    res.status(201).json({ event, participants });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event.' });
  }
};

// Update event
export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, is_dismissed, is_settled } = req.body;
    const userId = req.user?.id;

    // Handle is_dismissed separately (per-user preference)
    if (is_dismissed !== undefined) {
      // Check if preference exists
      const { data: existingPref } = await db
        .from('user_event_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('event_id', id)
        .single();

      if (existingPref) {
        // Update existing preference
        await db
          .from('user_event_preferences')
          .update({ is_dismissed })
          .eq('user_id', userId)
          .eq('event_id', id);
      } else {
        // Insert new preference
        await db
          .from('user_event_preferences')
          .insert({
            user_id: userId,
            event_id: id,
            is_dismissed
          });
      }

      return res.json({ message: 'Preference updated successfully' });
    }

    // For other fields, check if user is creator
    const { data: event } = await db
      .from('events')
      .select('created_by')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (!event || event.created_by !== userId) {
      return res.status(403).json({ error: 'Only event creator can update.' });
    }

    // Build update object (no longer includes is_dismissed)
    const updateData: any = {};
    if (name !== undefined) {
      // Import validation utilities
      const { sanitizeText } = await import('../utils/validation');
      const nameValidation = sanitizeText(name, 20);
      if (!nameValidation.valid) {
        return res.status(400).json({ error: nameValidation.error });
      }
      updateData.name = nameValidation.sanitized;
    }
    if (description !== undefined) updateData.description = description;
    if (is_settled !== undefined) updateData.is_settled = is_settled;

    // Update event
    const { data: updatedEvent, error } = await db
      .from('events')
      .update(updateData)
      .eq('event_id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update event.' });
    }

    res.json({ event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
};

// Soft delete event
export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is creator
    const { data: event } = await db
      .from('events')
      .select('created_by')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (!event || event.created_by !== userId) {
      return res.status(403).json({ error: 'Only event creator can delete.' });
    }

    // Soft delete event
    const { error } = await db
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('event_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete event.' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
};

// Remove participant from event
export const removeParticipant = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: participantUserId } = req.params;
    const currentUserId = req.user?.id;

    // Check if current user is creator
    const { data: event } = await db
      .from('events')
      .select('created_by')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (!event || event.created_by !== currentUserId) {
      return res.status(403).json({ error: 'Only event creator can remove participants.' });
    }

    // Can't remove creator
    if (participantUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove event creator.' });
    }

    // Soft delete all splits in this event created by or paid by this participant
    const { error: splitError } = await db
      .from('splits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('event_id', id)
      .or(`created_by.eq.${participantUserId},paid_by.eq.${participantUserId}`);

    if (splitError) {
      console.error('Split deletion error:', splitError);
      return res.status(500).json({ error: 'Failed to remove participant bills.' });
    }

    // Remove participant from all split_participants in this event
    const { data: eventSplits } = await db
      .from('splits')
      .select('split_id')
      .eq('event_id', id)
      .is('deleted_at', null);

    if (eventSplits && eventSplits.length > 0) {
      const splitIds = eventSplits.map(s => s.split_id);
      await db
        .from('split_participants')
        .delete()
        .in('split_id', splitIds)
        .eq('user_id', participantUserId);
    }

    // Remove participant's settled confirmation for this event
    await db
      .from('event_settled_confirmations')
      .delete()
      .eq('event_id', id)
      .eq('user_id', participantUserId);

    // Remove participant
    const { error } = await db
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('user_id', participantUserId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to remove participant.' });
    }

    res.json({ message: 'Participant removed successfully (including their bills)' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant.' });
  }
};

// Leave event (non-creator can remove themselves)
export const leaveEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user is participant
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(404).json({ error: 'Not a participant of this event.' });
    }

    // Get event to check if user is creator
    const { data: event } = await db
      .from('events')
      .select('created_by')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Can't leave if you're the creator - must delete event instead
    if (event.created_by === userId) {
      return res.status(400).json({ error: 'Event creator cannot leave. Delete the event instead.' });
    }

    // Soft delete all splits in this event created by or paid by this user
    const { error: splitError } = await db
      .from('splits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('event_id', id)
      .or(`created_by.eq.${userId},paid_by.eq.${userId}`);

    if (splitError) {
      console.error('Split deletion error:', splitError);
      return res.status(500).json({ error: 'Failed to remove your bills.' });
    }

    // Remove user from all split_participants in this event
    const { data: eventSplits } = await db
      .from('splits')
      .select('split_id')
      .eq('event_id', id)
      .is('deleted_at', null);

    if (eventSplits && eventSplits.length > 0) {
      const splitIds = eventSplits.map(s => s.split_id);
      await db
        .from('split_participants')
        .delete()
        .in('split_id', splitIds)
        .eq('user_id', userId);
    }

    // Remove user's settled confirmation for this event
    await db
      .from('event_settled_confirmations')
      .delete()
      .eq('event_id', id)
      .eq('user_id', userId);

    // Remove user from event
    const { error } = await db
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to leave event.' });
    }

    res.json({ message: 'Left event successfully (including your bills)' });
  } catch (error) {
    console.error('Leave event error:', error);
    res.status(500).json({ error: 'Failed to leave event.' });
  }
};

// Get event details by share token (public endpoint - no auth required)
export const getEventByShareToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params as { token: string };

    const { data: event, error } = await db
      .from('events')
      .select('event_id, name, description, created_by')
      .eq('share_token', token)
      .is('deleted_at', null)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Get creator name
    const { data: creator } = await db
      .from('users')
      .select('name')
      .eq('user_id', event.created_by)
      .single();

    res.json({ event: { ...event, creator_name: creator?.name } });
  } catch (error) {
    console.error('Get event by share token error:', error);
    res.status(500).json({ error: 'Failed to fetch event.' });
  }
};

// Join event by share token
export const joinEventByShareToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    // Get event by share token
    const { data: event, error: eventError } = await db
      .from('events')
      .select('event_id, name')
      .eq('share_token', token)
      .is('deleted_at', null)
      .single();

    if (eventError || !event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Check if already a participant
    const { data: existingParticipant } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event.event_id)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return res.status(400).json({ error: 'Already a participant of this event.' });
    }

    // Add user as participant
    const { error: participantError } = await db
      .from('event_participants')
      .insert({
        event_id: event.event_id,
        user_id: userId,
      });

    if (participantError) {
      console.error('Database error:', participantError);
      return res.status(500).json({ error: 'Failed to join event.' });
    }

    // Add new participant to ALL existing splits in this event
    const { data: existingSplits } = await db
      .from('splits')
      .select('split_id, amount')
      .eq('event_id', event.event_id)
      .is('deleted_at', null);

    if (existingSplits && existingSplits.length > 0) {
      for (const split of existingSplits) {
        // Get current participants for this split
        const { data: currentParticipants } = await db
          .from('split_participants')
          .select('user_id')
          .eq('split_id', split.split_id);

        // Recalculate amount_owed for everyone (including new person)
        const totalParticipants = (currentParticipants?.length || 0) + 1;
        const newAmountOwed = split.amount / totalParticipants;

        // Update existing participants' amounts
        if (currentParticipants && currentParticipants.length > 0) {
          for (const participant of currentParticipants) {
            await db
              .from('split_participants')
              .update({ amount_owed: newAmountOwed })
              .eq('split_id', split.split_id)
              .eq('user_id', participant.user_id);
          }
        }

        // Add new participant
        await db
          .from('split_participants')
          .insert({
            split_id: split.split_id,
            user_id: userId,
            amount_owed: newAmountOwed,
          });
      }
    }

    res.status(201).json({
      message: 'Successfully joined event',
      event_id: event.event_id
    });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ error: 'Failed to join event.' });
  }
};
