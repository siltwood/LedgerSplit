import { Response } from 'express';
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
          created_at
        )
      `)
      .eq('user_id', userId)
      .is('events.deleted_at', null);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Extract events from the nested structure
    const events = eventParticipants
      .map((ep: any) => ep.events)
      .filter(Boolean);

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
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
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Get event details
    const { data: event, error } = await db
      .from('events')
      .select('*')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (error || !event) {
      return res.status(404).json({ error: 'Event not found' });
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

    res.json({ event, participants });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
};

// Create new event
export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, participant_ids = [] } = req.body;
    const userId = req.user?.id;

    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Create event
    const { data: event, error: eventError } = await db
      .from('events')
      .insert({
        name,
        description,
        created_by: userId,
      })
      .select()
      .single();

    if (eventError) {
      console.error('Database error:', eventError);
      return res.status(500).json({ error: 'Failed to create event' });
    }

    // Add creator as participant
    const participantsToAdd = [userId, ...participant_ids.filter((id: string) => id !== userId)];

    const participantRecords = participantsToAdd.map((participantId: string) => ({
      event_id: event.event_id,
      user_id: participantId,
    }));

    const { error: participantError } = await db
      .from('event_participants')
      .insert(participantRecords);

    if (participantError) {
      console.error('Database error:', participantError);
      return res.status(500).json({ error: 'Failed to add participants' });
    }

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
};

// Update event
export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;

    // Check if user is creator
    const { data: event } = await db
      .from('events')
      .select('created_by')
      .eq('event_id', id)
      .is('deleted_at', null)
      .single();

    if (!event || event.created_by !== userId) {
      return res.status(403).json({ error: 'Only event creator can update' });
    }

    // Update event
    const { data: updatedEvent, error } = await db
      .from('events')
      .update({ name, description })
      .eq('event_id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to update event' });
    }

    res.json({ event: updatedEvent });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
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
      return res.status(403).json({ error: 'Only event creator can delete' });
    }

    // Soft delete event
    const { error } = await db
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('event_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete event' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

// Invite user to event
export const inviteToEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    const userId = req.user?.id;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if current user is participant
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Verify invited user exists
    const { data: invitedUser, error: userError } = await db
      .from('users')
      .select('user_id, email, name')
      .eq('user_id', user_id)
      .single();

    if (userError || !invitedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a participant
    const { data: existingParticipant } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', id)
      .eq('user_id', user_id)
      .single();

    if (existingParticipant) {
      return res.status(400).json({ error: 'User already in event' });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await db
      .from('event_invites')
      .select('*')
      .eq('event_id', id)
      .eq('invited_user', user_id)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return res.status(400).json({ error: 'Invite already sent' });
    }

    // Create invite
    const { data: invite, error: inviteError } = await db
      .from('event_invites')
      .insert({
        event_id: id,
        invited_by: userId,
        invited_user: user_id,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Database error:', inviteError);
      return res.status(500).json({ error: 'Failed to send invite' });
    }

    res.status(201).json({ message: 'Invite sent successfully', invite });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to send invite' });
  }
};

// Get pending invites for current user
export const getMyInvites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: invites, error } = await db
      .from('event_invites')
      .select(`
        invite_id,
        event_id,
        invited_by,
        status,
        created_at,
        events (
          event_id,
          name,
          description
        ),
        inviter:users!event_invites_invited_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch invites' });
    }

    res.json({ invites });
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Failed to fetch invites' });
  }
};

// Accept event invite
export const acceptInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get invite
    const { data: invite, error: inviteError } = await db
      .from('event_invites')
      .select('*')
      .eq('invite_id', id)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Add user to event
    const { error: participantError } = await db
      .from('event_participants')
      .insert({
        event_id: invite.event_id,
        user_id: userId,
      });

    if (participantError) {
      console.error('Database error:', participantError);
      return res.status(500).json({ error: 'Failed to join event' });
    }

    // Get all existing splits in this event
    const { data: splits } = await db
      .from('splits')
      .select('split_id, amount')
      .eq('event_id', invite.event_id)
      .is('deleted_at', null);

    // Add new user to all existing splits
    if (splits && splits.length > 0) {
      for (const split of splits) {
        // Get current split participants to recalculate amount_owed
        const { data: currentParticipants } = await db
          .from('split_participants')
          .select('user_id')
          .eq('split_id', split.split_id);

        const totalParticipants = (currentParticipants?.length || 0) + 1;
        const newAmountOwed = split.amount / totalParticipants;

        // Update existing participants' amount_owed
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

    // Update invite status
    await db
      .from('event_invites')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString(),
      })
      .eq('invite_id', id);

    res.json({ message: 'Invite accepted successfully' });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

// Decline event invite
export const declineInvite = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get invite
    const { data: invite, error: inviteError } = await db
      .from('event_invites')
      .select('*')
      .eq('invite_id', id)
      .eq('invited_user', userId)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    // Update invite status
    await db
      .from('event_invites')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
      })
      .eq('invite_id', id);

    res.json({ message: 'Invite declined' });
  } catch (error) {
    console.error('Decline invite error:', error);
    res.status(500).json({ error: 'Failed to decline invite' });
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
      return res.status(403).json({ error: 'Only event creator can remove participants' });
    }

    // Can't remove creator
    if (participantUserId === currentUserId) {
      return res.status(400).json({ error: 'Cannot remove event creator' });
    }

    // Soft delete all splits in this event created by or paid by this participant
    const { error: splitError } = await db
      .from('splits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('event_id', id)
      .or(`created_by.eq.${participantUserId},paid_by.eq.${participantUserId}`);

    if (splitError) {
      console.error('Split deletion error:', splitError);
      return res.status(500).json({ error: 'Failed to remove participant splits' });
    }

    // Remove participant
    const { error } = await db
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('user_id', participantUserId);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to remove participant' });
    }

    res.json({ message: 'Participant removed successfully (including their splits)' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
};
