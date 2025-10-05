import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all splits (optionally filter by event_id)
export const getSplits = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { event_id } = req.query;

    // Get all events user is part of
    const { data: eventParticipations } = await db
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId);

    if (!eventParticipations || eventParticipations.length === 0) {
      return res.json({ splits: [] });
    }

    const eventIds = eventParticipations.map((ep: any) => ep.event_id);

    // Build query
    let query = db
      .from('splits')
      .select(`
        *,
        event:events (
          event_id,
          name
        ),
        payer:users!splits_paid_by_fkey (
          user_id,
          name,
          email,
          avatar_url
        ),
        creator:users!splits_created_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .in('event_id', eventIds)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    // Apply event_id filter if provided
    if (event_id) {
      query = query.eq('event_id', event_id);
    }

    const { data: splits, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch splits' });
    }

    res.json({ splits });
  } catch (error) {
    console.error('Get splits error:', error);
    res.status(500).json({ error: 'Failed to fetch splits' });
  }
};

// Get single split by ID
export const getSplitById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get split details
    const { data: split, error: splitError } = await db
      .from('splits')
      .select(`
        *,
        event:events (
          event_id,
          name
        ),
        payer:users!splits_paid_by_fkey (
          user_id,
          name,
          email,
          avatar_url
        ),
        creator:users!splits_created_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .eq('split_id', id)
      .is('deleted_at', null)
      .single();

    if (splitError || !split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Check if user is participant of the event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', split.event_id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Get split participants
    const { data: participants } = await db
      .from('split_participants')
      .select(`
        user_id,
        amount_owed,
        users (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('split_id', id);

    res.json({ split, participants });
  } catch (error) {
    console.error('Get split error:', error);
    res.status(500).json({ error: 'Failed to fetch split' });
  }
};

// Create new split
export const createSplit = async (req: AuthRequest, res: Response) => {
  try {
    const {
      event_id,
      title,
      amount,
      currency = 'USD',
      paid_by,
      participant_ids = [],
      date,
      notes,
    } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!event_id || !title || !amount || !paid_by) {
      return res.status(400).json({
        error: 'Event ID, title, amount, and paid_by are required',
      });
    }

    // Allow creating splits with no participants initially
    // (they will be added when event participants join)

    // Check if user is participant of the event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event' });
    }

    // Verify paid_by user is participant
    const { data: payerParticipation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', paid_by)
      .single();

    if (!payerParticipation) {
      return res.status(400).json({ error: 'Payer must be a participant of the event' });
    }

    // Verify all participant_ids are participants of the event
    for (const participantId of participant_ids) {
      const { data: participation } = await db
        .from('event_participants')
        .select('*')
        .eq('event_id', event_id)
        .eq('user_id', participantId)
        .single();

      if (!participation) {
        return res.status(400).json({
          error: `User ${participantId} is not a participant of this event`,
        });
      }
    }

    // Calculate amount owed per participant (equal split)
    const amountOwed = participant_ids && participant_ids.length > 0
      ? parseFloat(amount) / participant_ids.length
      : 0;

    // Create split
    const { data: split, error: splitError } = await db
      .from('splits')
      .insert({
        event_id,
        title,
        amount: parseFloat(amount),
        currency,
        paid_by,
        created_by: userId,
        date: date || new Date().toISOString(),
        notes,
      })
      .select()
      .single();

    if (splitError) {
      console.error('Database error:', splitError);
      return res.status(500).json({ error: 'Failed to create split' });
    }

    // Add split participants (only if there are any)
    if (participant_ids && participant_ids.length > 0) {
      const participantRecords = participant_ids.map((participantId: string) => ({
        split_id: split.split_id,
        user_id: participantId,
        amount_owed: amountOwed,
      }));

      const { error: participantError } = await db
        .from('split_participants')
        .insert(participantRecords);

      if (participantError) {
        console.error('Database error:', participantError);
        // Rollback: delete the split
        await db.from('splits').delete().eq('split_id', split.split_id);
        return res.status(500).json({ error: 'Failed to add split participants' });
      }
    }

    res.status(201).json({ split });
  } catch (error) {
    console.error('Create split error:', error);
    res.status(500).json({ error: 'Failed to create split' });
  }
};

// Update split
export const updateSplit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      amount,
      currency,
      paid_by,
      participant_ids,
      date,
      notes,
    } = req.body;
    const userId = req.user?.id;

    // Get split to check permissions
    const { data: existingSplit, error: fetchError } = await db
      .from('splits')
      .select('*, event_id')
      .eq('split_id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingSplit) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Check if user is creator of the split
    if (existingSplit.created_by !== userId) {
      return res.status(403).json({ error: 'Only split creator can update' });
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (paid_by !== undefined) {
      // Verify paid_by user is participant
      const { data: payerParticipation } = await db
        .from('event_participants')
        .select('*')
        .eq('event_id', existingSplit.event_id)
        .eq('user_id', paid_by)
        .single();

      if (!payerParticipation) {
        return res.status(400).json({ error: 'Payer must be a participant of the event' });
      }
      updateData.paid_by = paid_by;
    }
    if (date !== undefined) updateData.date = date;
    if (notes !== undefined) updateData.notes = notes;

    // Update split
    const { data: updatedSplit, error: updateError } = await db
      .from('splits')
      .update(updateData)
      .eq('split_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to update split' });
    }

    // If participant_ids or amount changed, update split_participants
    if (participant_ids !== undefined || amount !== undefined) {
      const finalAmount = amount !== undefined ? parseFloat(amount) : existingSplit.amount;
      const finalParticipantIds = participant_ids !== undefined ? participant_ids : [];

      if (finalParticipantIds.length > 0) {
        // Verify all participant_ids are participants of the event
        for (const participantId of finalParticipantIds) {
          const { data: participation } = await db
            .from('event_participants')
            .select('*')
            .eq('event_id', existingSplit.event_id)
            .eq('user_id', participantId)
            .single();

          if (!participation) {
            return res.status(400).json({
              error: `User ${participantId} is not a participant of this event`,
            });
          }
        }

        const amountOwed = finalAmount / finalParticipantIds.length;

        // Delete existing participants
        await db.from('split_participants').delete().eq('split_id', id);

        // Add new participants
        const participantRecords = finalParticipantIds.map((participantId: string) => ({
          split_id: id,
          user_id: participantId,
          amount_owed: amountOwed,
        }));

        const { error: participantError } = await db
          .from('split_participants')
          .insert(participantRecords);

        if (participantError) {
          console.error('Database error:', participantError);
          return res.status(500).json({ error: 'Failed to update split participants' });
        }
      }
    }

    res.json({ split: updatedSplit });
  } catch (error) {
    console.error('Update split error:', error);
    res.status(500).json({ error: 'Failed to update split' });
  }
};

// Soft delete split
export const deleteSplit = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get split to check permissions
    const { data: split } = await db
      .from('splits')
      .select('created_by')
      .eq('split_id', id)
      .is('deleted_at', null)
      .single();

    if (!split) {
      return res.status(404).json({ error: 'Split not found' });
    }

    // Check if user is creator
    if (split.created_by !== userId) {
      return res.status(403).json({ error: 'Only split creator can delete' });
    }

    // Soft delete split
    const { error } = await db
      .from('splits')
      .update({ deleted_at: new Date().toISOString() })
      .eq('split_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete split' });
    }

    res.json({ message: 'Split deleted successfully' });
  } catch (error) {
    console.error('Delete split error:', error);
    res.status(500).json({ error: 'Failed to delete split' });
  }
};
