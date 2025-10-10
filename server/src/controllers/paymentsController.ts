import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all payments for an event
export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { event_id } = req.query;
    const userId = req.user?.id;

    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required.' });
    }

    // Check if user is participant of the event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event.' });
    }

    // Get all payments for this event
    const { data: payments, error } = await db
      .from('payments')
      .select(`
        *,
        from_user:users!payments_from_user_id_fkey (
          user_id,
          name,
          email,
          avatar_url
        ),
        to_user:users!payments_to_user_id_fkey (
          user_id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('event_id', event_id)
      .is('deleted_at', null)
      .order('payment_date', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch payments.' });
    }

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
};

// Create new payment
export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      event_id,
      from_user_id,
      to_user_id,
      amount,
      notes,
      payment_date
    } = req.body;
    const userId = req.user?.id;

    // Validate required fields
    if (!event_id || !from_user_id || !to_user_id || !amount) {
      return res.status(400).json({
        error: 'Event ID, from_user_id, to_user_id, and amount are required.',
      });
    }

    // Validate amount
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    // Check if user is participant of the event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not a participant of this event.' });
    }

    // Verify both users are participants
    const { data: fromParticipation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', from_user_id)
      .single();

    const { data: toParticipation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', event_id)
      .eq('user_id', to_user_id)
      .single();

    if (!fromParticipation || !toParticipation) {
      return res.status(400).json({ error: 'Both users must be participants of the event.' });
    }

    // Create payment
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .insert({
        event_id,
        from_user_id,
        to_user_id,
        amount: parseFloat(amount),
        notes,
        payment_date: payment_date || new Date().toISOString(),
        created_by: userId,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Database error:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment.' });
    }

    res.status(201).json({ payment });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment.' });
  }
};

// Delete payment
export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Get payment to check permissions
    const { data: payment } = await db
      .from('payments')
      .select('created_by, event_id')
      .eq('payment_id', id)
      .is('deleted_at', null)
      .single();

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found.' });
    }

    // Check if user is creator OR check if user is participant of the event
    const { data: participation } = await db
      .from('event_participants')
      .select('*')
      .eq('event_id', payment.event_id)
      .eq('user_id', userId)
      .single();

    if (!participation) {
      return res.status(403).json({ error: 'Not authorized to delete this payment.' });
    }

    // Soft delete payment
    const { error } = await db
      .from('payments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('payment_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete payment.' });
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment.' });
  }
};
