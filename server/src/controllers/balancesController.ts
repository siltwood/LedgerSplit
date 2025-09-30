import { Response } from 'express';
import { db } from '../config/database';
import { AuthRequest } from '../middleware/auth';

interface Debt {
  [debtor: string]: {
    [creditor: string]: number;
  };
}

// Calculate exact debts between users (no simplification)
const calculateDebts = (expenses: any[], settlements: any[]): Debt => {
  const debts: Debt = {};

  // Helper to add debt
  const addDebt = (debtor: string, creditor: string, amount: number) => {
    if (!debts[debtor]) debts[debtor] = {};
    if (!debts[debtor][creditor]) debts[debtor][creditor] = 0;
    debts[debtor][creditor] += amount;
  };

  // Helper to subtract debt (from settlements)
  const subtractDebt = (debtor: string, creditor: string, amount: number) => {
    if (!debts[debtor]) debts[debtor] = {};
    if (!debts[debtor][creditor]) debts[debtor][creditor] = 0;
    debts[debtor][creditor] -= amount;
  };

  // Process expenses
  for (const expense of expenses) {
    const paidBy = expense.paid_by;

    for (const split of expense.expense_splits) {
      const userId = split.user_id;
      const amountOwed = parseFloat(split.amount_owed);

      // If someone other than the payer owes money
      if (userId !== paidBy) {
        addDebt(userId, paidBy, amountOwed);
      }
    }
  }

  // Process settlements
  for (const settlement of settlements) {
    const paidBy = settlement.paid_by;
    const paidTo = settlement.paid_to;
    const amount = parseFloat(settlement.amount);

    subtractDebt(paidBy, paidTo, amount);
  }

  return debts;
};

// Get balance for a specific user
export const getUserBalance = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    // Get all expenses (we'll filter client-side for now)
    const { data: expenses, error: expensesError } = await db
      .from('expenses')
      .select(`
        expense_id,
        paid_by,
        expense_splits (
          user_id,
          amount_owed
        )
      `)
      .is('deleted_at', null);

    // Get all settlements (we'll filter in memory)
    const { data: settlements, error: settlementsError } = await db
      .from('settlements')
      .select('*');

    if (expensesError || settlementsError) {
      console.error('Database error');
      return res.status(500).json({ error: 'Failed to calculate balance' });
    }

    const debts = calculateDebts(expenses || [], settlements || []);

    // Calculate user's total balance
    let totalBalance = 0;
    const owes: any[] = []; // What user owes to others
    const owedBy: any[] = []; // What others owe to user

    // What user owes
    if (debts[userId]) {
      for (const [creditor, amount] of Object.entries(debts[userId])) {
        if (amount > 0.01) {
          const { data: creditorUser } = await db
            .from('users')
            .select('user_id, name, email')
            .eq('user_id', creditor)
            .single();

          owes.push({
            user: creditorUser,
            amount: amount.toFixed(2),
          });
          totalBalance -= amount;
        }
      }
    }

    // What others owe to user
    for (const [debtor, creditors] of Object.entries(debts)) {
      if (creditors[userId] && creditors[userId] > 0.01) {
        const { data: debtorUser } = await db
          .from('users')
          .select('user_id, name, email')
          .eq('user_id', debtor)
          .single();

        owedBy.push({
          user: debtorUser,
          amount: creditors[userId].toFixed(2),
        });
        totalBalance += creditors[userId];
      }
    }

    res.json({
      userId,
      totalBalance: totalBalance.toFixed(2),
      owes,
      owedBy,
    });
  } catch (error) {
    console.error('Get user balance error:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
};

// Get balance between two users
export const getBalanceBetween = async (req: AuthRequest, res: Response) => {
  try {
    const { userId1, userId2 } = req.params;

    // Get all expenses involving both users
    const { data: expenses, error: expensesError } = await db
      .from('expenses')
      .select(`
        expense_id,
        paid_by,
        expense_splits!inner (
          user_id,
          amount_owed
        )
      `)
      .is('deleted_at', null)
      .or(`paid_by.eq.${userId1},paid_by.eq.${userId2}`)
      .or(`expense_splits.user_id.eq.${userId1},expense_splits.user_id.eq.${userId2}`);

    // Get all settlements between these users
    const { data: settlements, error: settlementsError } = await db
      .from('settlements')
      .select('*')
      .or(`and(paid_by.eq.${userId1},paid_to.eq.${userId2}),and(paid_by.eq.${userId2},paid_to.eq.${userId1})`);

    if (expensesError || settlementsError) {
      console.error('Database error');
      return res.status(500).json({ error: 'Failed to calculate balance' });
    }

    const debts = calculateDebts(expenses || [], settlements || []);

    // Calculate net balance
    let netBalance = 0;

    if (debts[userId1] && debts[userId1][userId2]) {
      netBalance -= debts[userId1][userId2]; // userId1 owes userId2
    }

    if (debts[userId2] && debts[userId2][userId1]) {
      netBalance += debts[userId2][userId1]; // userId2 owes userId1
    }

    // Get user details
    const { data: user1 } = await db
      .from('users')
      .select('user_id, name, email')
      .eq('user_id', userId1)
      .single();

    const { data: user2 } = await db
      .from('users')
      .select('user_id, name, email')
      .eq('user_id', userId2)
      .single();

    res.json({
      user1,
      user2,
      balance: netBalance.toFixed(2),
      summary: netBalance > 0
        ? `${user2?.name} owes ${user1?.name} $${Math.abs(netBalance).toFixed(2)}`
        : netBalance < 0
        ? `${user1?.name} owes ${user2?.name} $${Math.abs(netBalance).toFixed(2)}`
        : 'Settled up',
    });
  } catch (error) {
    console.error('Get balance between error:', error);
    res.status(500).json({ error: 'Failed to calculate balance' });
  }
};

// Get group balances
export const getGroupBalances = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    // Check if user is member
    const { data: membership } = await db
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Get all expenses in group
    const { data: expenses, error: expensesError } = await db
      .from('expenses')
      .select(`
        expense_id,
        paid_by,
        expense_splits (
          user_id,
          amount_owed
        )
      `)
      .eq('group_id', groupId)
      .is('deleted_at', null);

    // Get all settlements in group
    const { data: settlements, error: settlementsError } = await db
      .from('settlements')
      .select('*')
      .eq('group_id', groupId);

    if (expensesError || settlementsError) {
      console.error('Database error');
      return res.status(500).json({ error: 'Failed to calculate balances' });
    }

    const debts = calculateDebts(expenses || [], settlements || []);

    // Format balances for all members
    const balances: any[] = [];

    for (const [debtor, creditors] of Object.entries(debts)) {
      for (const [creditor, amount] of Object.entries(creditors)) {
        if (amount > 0.01) {
          const { data: debtorUser } = await db
            .from('users')
            .select('user_id, name, email')
            .eq('user_id', debtor)
            .single();

          const { data: creditorUser } = await db
            .from('users')
            .select('user_id, name, email')
            .eq('user_id', creditor)
            .single();

          balances.push({
            debtor: debtorUser,
            creditor: creditorUser,
            amount: amount.toFixed(2),
            summary: `${debtorUser?.name} owes ${creditorUser?.name} $${amount.toFixed(2)}`,
          });
        }
      }
    }

    res.json({ groupId, balances });
  } catch (error) {
    console.error('Get group balances error:', error);
    res.status(500).json({ error: 'Failed to calculate balances' });
  }
};