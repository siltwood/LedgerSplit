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

    // Import validation utilities
    const { sanitizeText, isValidUUID } = await import('../utils/validation');

    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    // Validate and sanitize name
    const nameValidation = sanitizeText(name, 200);
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
          return res.status(400).json({ error: 'Invalid participant ID format' });
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
      return res.status(500).json({ error: 'Failed to create event' });
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
      return res.status(500).json({ error: 'Failed to add participants' });
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
    const { user_id, email } = req.body;
    const userId = req.user?.id;

    // Must provide either user_id or email
    if (!user_id && !email) {
      return res.status(400).json({ error: 'User ID or email is required' });
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

    // Get event details for email
    const { data: event } = await db
      .from('events')
      .select('name')
      .eq('event_id', id)
      .single();

    // Get inviter name for email
    const { data: inviter } = await db
      .from('users')
      .select('name')
      .eq('user_id', userId)
      .single();

    let inviteData: any;
    let shouldSendEmail = false;
    let inviteEmail = '';

    if (user_id) {
      // Inviting existing user
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

      inviteData = {
        event_id: id,
        invited_by: userId,
        invited_user: user_id,
        status: 'pending',
      };
    } else if (email) {
      // Inviting by email (non-user or existing user)
      // Check if user with this email already exists
      const { data: existingUser } = await db
        .from('users')
        .select('user_id')
        .eq('email', email.toLowerCase())
        .single();

      if (existingUser) {
        // User exists - invite them by user_id instead
        // Check if already a participant
        const { data: existingParticipant } = await db
          .from('event_participants')
          .select('*')
          .eq('event_id', id)
          .eq('user_id', existingUser.user_id)
          .single();

        if (existingParticipant) {
          return res.status(400).json({ error: 'User already in event' });
        }

        // Check for existing pending invite
        const { data: existingInvite } = await db
          .from('event_invites')
          .select('*')
          .eq('event_id', id)
          .eq('invited_user', existingUser.user_id)
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          return res.status(400).json({ error: 'Invite already sent' });
        }

        // Invite by user_id
        inviteData = {
          event_id: id,
          invited_by: userId,
          invited_user: existingUser.user_id,
          status: 'pending',
        };
      } else {
        // User doesn't exist - send email invite
        // Check for existing email invite
        const { data: existingInvite } = await db
          .from('event_invites')
          .select('*')
          .eq('event_id', id)
          .eq('invited_email', email.toLowerCase())
          .eq('status', 'pending')
          .single();

        if (existingInvite) {
          return res.status(400).json({ error: 'Invite already sent to this email' });
        }

        inviteData = {
          event_id: id,
          invited_by: userId,
          invited_email: email.toLowerCase(),
          status: 'pending',
        };

        shouldSendEmail = true;
        inviteEmail = email;
      }
    }

    // Create invite
    const { data: invite, error: inviteError } = await db
      .from('event_invites')
      .insert(inviteData)
      .select()
      .single();

    if (inviteError) {
      console.error('Database error:', inviteError);
      return res.status(500).json({ error: 'Failed to send invite' });
    }

    // Send email for email invites
    if (shouldSendEmail && invite?.invite_token) {
      const { sendEventInviteEmail } = require('../services/email');
      try {
        await sendEventInviteEmail(
          inviteEmail,
          inviter?.name || 'Someone',
          event?.name || 'an event',
          invite.invite_token
        );
      } catch (emailError) {
        console.error('Failed to send invite email:', emailError);
        // Don't fail the request if email fails
      }
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

// Accept event invite by token (for email invites)
export const acceptInviteByToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get invite by token
    const { data: invite, error: inviteError } = await db
      .from('event_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('status', 'pending')
      .single();

    if (inviteError || !invite) {
      return res.status(404).json({ error: 'Invite not found or already used' });
    }

    // Check if this is an email invite and matches current user
    if (invite.invited_email) {
      const { data: user } = await db
        .from('users')
        .select('email')
        .eq('user_id', userId)
        .single();

      if (!user || user.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
        return res.status(403).json({
          error: 'This invite was sent to a different email address'
        });
      }

      // Update invite to link to this user
      await db
        .from('event_invites')
        .update({ invited_user: userId })
        .eq('invite_id', invite.invite_id);
    } else if (invite.invited_user && invite.invited_user !== userId) {
      // User-based invite for different user
      return res.status(403).json({ error: 'This invite is for a different user' });
    }

    // Check if already a participant
    const { data: existingParticipant } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', invite.event_id)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      // Already in event, just mark invite as accepted
      await db
        .from('event_invites')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('invite_id', invite.invite_id);

      return res.json({ message: 'Already a member of this event', event_id: invite.event_id });
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
      .eq('invite_id', invite.invite_id);

    res.json({ message: 'Invite accepted successfully', event_id: invite.event_id });
  } catch (error) {
    console.error('Accept invite by token error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
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
      return res.status(404).json({ error: 'Event not found' });
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
    res.status(500).json({ error: 'Failed to fetch event' });
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
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already a participant
    const { data: existingParticipant } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event.event_id)
      .eq('user_id', userId)
      .single();

    if (existingParticipant) {
      return res.status(400).json({ error: 'Already a participant of this event' });
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
      return res.status(500).json({ error: 'Failed to join event' });
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
    res.status(500).json({ error: 'Failed to join event' });
  }
};
