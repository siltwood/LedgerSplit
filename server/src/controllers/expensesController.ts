import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Get all expenses (with filters)
export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { group_id, user_id } = req.query;

    let query = db
      .from('expenses')
      .select(`
        *,
        expense_splits (
          user_id,
          amount_owed,
          users (
            user_id,
            name,
            email
          )
        ),
        paid_by_user:users!expenses_paid_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .is('deleted_at', null)
      .order('date', { ascending: false });

    if (group_id) {
      query = query.eq('group_id', group_id);
    }

    if (user_id) {
      // Filter expenses where user paid (we'll filter splits client-side if needed)
      query = query.eq('paid_by', user_id);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }

    res.json({ expenses });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

// Get single expense by ID
export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: expense, error } = await db
      .from('expenses')
      .select(`
        *,
        expense_splits (
          user_id,
          amount_owed,
          users (
            user_id,
            name,
            email
          )
        ),
        paid_by_user:users!expenses_paid_by_fkey (
          user_id,
          name,
          email
        )
      `)
      .eq('expense_id', id)
      .is('deleted_at', null)
      .single();

    if (error || !expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

// Create expense with splits
export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const {
      group_id,
      description,
      amount,
      currency,
      paid_by,
      date,
      notes,
      splits, // Array of { user_id, amount_owed }
    } = req.body;
    const userId = req.user?.id;

    // Validate splits sum to amount
    const totalSplit = splits.reduce((sum: number, split: any) => sum + parseFloat(split.amount_owed), 0);
    if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
      return res.status(400).json({ error: 'Splits must sum to total amount' });
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

    // Create expense
    const { data: expense, error: expenseError } = await db
      .from('expenses')
      .insert({
        group_id,
        description,
        amount,
        currency: currency || 'USD',
        paid_by,
        created_by: userId,
        date,
        notes,
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Database error:', expenseError);
      return res.status(500).json({ error: 'Failed to create expense' });
    }

    // Create splits
    const splitRecords = splits.map((split: any) => ({
      expense_id: expense.expense_id,
      user_id: split.user_id,
      amount_owed: split.amount_owed,
    }));

    const { error: splitsError } = await db.from('expense_splits').insert(splitRecords);

    if (splitsError) {
      console.error('Database error:', splitsError);
      return res.status(500).json({ error: 'Failed to create expense splits' });
    }

    res.status(201).json({ expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

// Update expense
export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      description,
      amount,
      currency,
      paid_by,
      date,
      notes,
      splits,
    } = req.body;
    const userId = req.user?.id;

    // Check if user created the expense
    const { data: expense } = await db
      .from('expenses')
      .select('created_by')
      .eq('expense_id', id)
      .is('deleted_at', null)
      .single();

    if (!expense || expense.created_by !== userId) {
      return res.status(403).json({ error: 'Only expense creator can update' });
    }

    // Validate splits if provided
    if (splits) {
      const totalSplit = splits.reduce((sum: number, split: any) => sum + parseFloat(split.amount_owed), 0);
      if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        return res.status(400).json({ error: 'Splits must sum to total amount' });
      }
    }

    // Update expense
    const { data: updatedExpense, error: updateError } = await db
      .from('expenses')
      .update({
        description,
        amount,
        currency,
        paid_by,
        date,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('expense_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to update expense' });
    }

    // Update splits if provided
    if (splits) {
      // Delete old splits
      await db.from('expense_splits').delete().eq('expense_id', id);

      // Insert new splits
      const splitRecords = splits.map((split: any) => ({
        expense_id: id,
        user_id: split.user_id,
        amount_owed: split.amount_owed,
      }));

      await db.from('expense_splits').insert(splitRecords);
    }

    res.json({ expense: updatedExpense });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

// Delete expense (soft delete)
export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user created the expense
    const { data: expense } = await db
      .from('expenses')
      .select('created_by')
      .eq('expense_id', id)
      .is('deleted_at', null)
      .single();

    if (!expense || expense.created_by !== userId) {
      return res.status(403).json({ error: 'Only expense creator can delete' });
    }

    // Soft delete
    const { error } = await db
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('expense_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to delete expense' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

// Restore deleted expense
export const restoreExpense = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if user created the expense
    const { data: expense } = await db
      .from('expenses')
      .select('created_by')
      .eq('expense_id', id)
      .not('deleted_at', 'is', null)
      .single();

    if (!expense || expense.created_by !== userId) {
      return res.status(403).json({ error: 'Only expense creator can restore' });
    }

    // Restore
    const { error } = await db
      .from('expenses')
      .update({ deleted_at: null })
      .eq('expense_id', id);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to restore expense' });
    }

    res.json({ message: 'Expense restored successfully' });
  } catch (error) {
    console.error('Restore expense error:', error);
    res.status(500).json({ error: 'Failed to restore expense' });
  }
};