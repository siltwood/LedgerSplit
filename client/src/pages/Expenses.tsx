import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { expensesAPI } from '../services/api';
import type { Expense } from '../types/index';
import UserName from '../components/UserName';
import { colors } from '../styles/colors';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const response = await expensesAPI.getAll();
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>All Expenses</h1>
        <Link to="/expenses/new">
          <button style={{
            padding: '10px 20px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Add Expense
          </button>
        </Link>
      </div>

      {expenses.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>No expenses yet. Add one to get started!</p>
      ) : (
        <div>
          {expenses.map((expense) => (
            <div key={expense.expense_id} style={{
              padding: '20px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ margin: '0 0 5px 0' }}>{expense.description}</h3>
                  <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                    Paid by <UserName user={expense.paid_by_user} /> on {new Date(expense.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary }}>
                  ${expense.amount}
                </div>
              </div>

              {expense.notes && (
                <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '10px' }}>
                  {expense.notes}
                </div>
              )}

              {expense.expense_splits && expense.expense_splits.length > 0 && (
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }}>
                  <strong style={{ fontSize: '14px' }}>Split between:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '5px' }}>
                    {expense.expense_splits.map((split: any, i: number) => (
                      <span key={i} style={{
                        padding: '4px 8px',
                        background: colors.surfaceLight,
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}>
                        <UserName user={split.users} />: ${split.amount_owed}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
