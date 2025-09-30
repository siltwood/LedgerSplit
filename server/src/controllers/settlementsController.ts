import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get settlements (with filters)
export const getSettlements = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { group_id, user_id } = req.query;

    let query = db
      .from('settlements')
      .select(`
        *,
        paid_by_user:users!settlements_paid_by_fkey (
          user_id,
          name,
          email
        ),
        paid_to_user:users!settlements_paid_to_fkey (
          user_id,
          name,
          email
        )
      `)
      .order('date', { ascending: false });

    if (group_id) {
      query = query.eq('group_id', group_id);
    }

    if (user_id) {
      // Filter settlements where user is involved
      query = query.or(`paid_by.eq.${user_id},paid_to.eq.${user_id}`);
    }

    const { data: settlements, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch settlements' });
    }

    res.json({ settlements });
  } catch (error) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
};

// Create settlement
export const createSettlement = async (req: AuthRequest, res: Response) => {
  try {
    const {
      group_id,
      paid_by,
      paid_to,
      amount,
      currency,
      date,
      notes,
    } = req.body;
    const userId = req.user?.id;

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Can't pay yourself
    if (paid_by === paid_to) {
      return res.status(400).json({ error: 'Cannot settle with yourself' });
    }

    // If group_id provided, verify user is member
    if (group_id) {
      const { data: membership } = await db
        .from('group_members')
        .select('*')
        .eq('group_id', group_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this group' });
      }
    }

    // Create settlement
    const { data: settlement, error } = await db
      .from('settlements')
      .insert({
        group_id,
        paid_by,
        paid_to,
        amount,
        currency: currency || 'USD',
        date: date || new Date().toISOString().split('T')[0],
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create settlement' });
    }

    res.status(201).json({ settlement });
  } catch (error) {
    console.error('Create settlement error:', error);
    res.status(500).json({ error: 'Failed to create settlement' });
  }
};