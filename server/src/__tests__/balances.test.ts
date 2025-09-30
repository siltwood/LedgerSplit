describe('Balance Calculation Logic', () => {
  interface Debt {
    [debtor: string]: {
      [creditor: string]: number;
    };
  }

  const calculateDebts = (expenses: any[], settlements: any[]): Debt => {
    const debts: Debt = {};

    const addDebt = (debtor: string, creditor: string, amount: number) => {
      if (!debts[debtor]) debts[debtor] = {};
      if (!debts[debtor][creditor]) debts[debtor][creditor] = 0;
      debts[debtor][creditor] += amount;
    };

    const subtractDebt = (debtor: string, creditor: string, amount: number) => {
      if (!debts[debtor]) debts[debtor] = {};
      if (!debts[debtor][creditor]) debts[debtor][creditor] = 0;
      debts[debtor][creditor] -= amount;
    };

    for (const expense of expenses) {
      const paidBy = expense.paid_by;
      for (const split of expense.expense_splits) {
        const userId = split.user_id;
        const amountOwed = parseFloat(split.amount_owed);
        if (userId !== paidBy) {
          addDebt(userId, paidBy, amountOwed);
        }
      }
    }

    for (const settlement of settlements) {
      subtractDebt(settlement.paid_by, settlement.paid_to, parseFloat(settlement.amount));
    }

    return debts;
  };

  describe('Expense splitting', () => {
    it('should calculate simple 50/50 split', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '50.00' },
            { user_id: 'user2', amount_owed: '50.00' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBe(50);
      expect(debts['user1']).toBeUndefined();
    });

    it('should calculate unequal split', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '30.00' },
            { user_id: 'user2', amount_owed: '70.00' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBe(70);
      expect(debts['user1']).toBeUndefined();
    });

    it('should handle multiple expenses', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '50.00' },
            { user_id: 'user2', amount_owed: '50.00' },
          ],
        },
        {
          paid_by: 'user2',
          expense_splits: [
            { user_id: 'user1', amount_owed: '30.00' },
            { user_id: 'user2', amount_owed: '30.00' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBe(50);
      expect(debts['user1']['user2']).toBe(30);
    });

    it('should handle three-way split', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '33.33' },
            { user_id: 'user2', amount_owed: '33.33' },
            { user_id: 'user3', amount_owed: '33.34' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBeCloseTo(33.33, 2);
      expect(debts['user3']['user1']).toBeCloseTo(33.34, 2);
      expect(debts['user1']).toBeUndefined();
    });
  });

  describe('Settlement handling', () => {
    it('should subtract settlement from debt', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '50.00' },
            { user_id: 'user2', amount_owed: '50.00' },
          ],
        },
      ];

      const settlements = [
        {
          paid_by: 'user2',
          paid_to: 'user1',
          amount: '30.00',
        },
      ];

      const debts = calculateDebts(expenses, settlements);

      expect(debts['user2']['user1']).toBe(20); // 50 - 30
    });

    it('should handle full settlement', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '50.00' },
            { user_id: 'user2', amount_owed: '50.00' },
          ],
        },
      ];

      const settlements = [
        {
          paid_by: 'user2',
          paid_to: 'user1',
          amount: '50.00',
        },
      ];

      const debts = calculateDebts(expenses, settlements);

      expect(debts['user2']['user1']).toBe(0);
    });

    it('should handle over-payment', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '50.00' },
            { user_id: 'user2', amount_owed: '50.00' },
          ],
        },
      ];

      const settlements = [
        {
          paid_by: 'user2',
          paid_to: 'user1',
          amount: '70.00',
        },
      ];

      const debts = calculateDebts(expenses, settlements);

      expect(debts['user2']['user1']).toBe(-20); // Overpaid by 20
    });
  });

  describe('Complex scenarios', () => {
    it('should handle circular debts correctly', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user2', amount_owed: '100.00' },
          ],
        },
        {
          paid_by: 'user2',
          expense_splits: [
            { user_id: 'user3', amount_owed: '100.00' },
          ],
        },
        {
          paid_by: 'user3',
          expense_splits: [
            { user_id: 'user1', amount_owed: '100.00' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBe(100);
      expect(debts['user3']['user2']).toBe(100);
      expect(debts['user1']['user3']).toBe(100);
    });

    it('should handle group expense with different splits', () => {
      const expenses = [
        {
          paid_by: 'user1',
          expense_splits: [
            { user_id: 'user1', amount_owed: '40.00' },
            { user_id: 'user2', amount_owed: '30.00' },
            { user_id: 'user3', amount_owed: '20.00' },
            { user_id: 'user4', amount_owed: '10.00' },
          ],
        },
      ];

      const debts = calculateDebts(expenses, []);

      expect(debts['user2']['user1']).toBe(30);
      expect(debts['user3']['user1']).toBe(20);
      expect(debts['user4']['user1']).toBe(10);
    });
  });
});