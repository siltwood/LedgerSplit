import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { balancesAPI, groupsAPI, expensesAPI } from '../services/api';
import type { Balance, Group, Expense } from '../types/index';

export default function Dashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Load groups first
      const groupsRes = await groupsAPI.getAll();
      setGroups(groupsRes.data.groups);

      // Try to load balance and expenses, but don't fail if they error
      try {
        const balanceRes = await balancesAPI.getUserBalance(user.id);
        setBalance(balanceRes.data);
      } catch (err) {
        console.log('No balance data yet');
      }

      try {
        const expensesRes = await expensesAPI.getAll();
        setRecentExpenses(expensesRes.data.expenses.slice(0, 5));
      } catch (err) {
        console.log('No expenses yet');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  const totalBalance = parseFloat(balance?.totalBalance || '0');
  const balanceColor = totalBalance > 0 ? '#28a745' : totalBalance < 0 ? '#dc3545' : '#6c757d';

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}!</p>

      {/* Balance Summary */}
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2>Your Balance</h2>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: balanceColor }}>
          ${Math.abs(totalBalance).toFixed(2)}
        </div>
        <div style={{ color: '#6c757d', marginTop: '5px' }}>
          {totalBalance > 0 && `You are owed`}
          {totalBalance < 0 && `You owe`}
          {totalBalance === 0 && `Settled up`}
        </div>

        {balance && (
          <div style={{ marginTop: '20px' }}>
            {balance.owedBy.length > 0 && (
              <div style={{ marginBottom: '15px' }}>
                <h4>Owed to you:</h4>
                {balance.owedBy.map((item, i) => (
                  <div key={i} style={{ color: '#28a745' }}>
                    {item.user.name} owes you ${item.amount}
                  </div>
                ))}
              </div>
            )}

            {balance.owes.length > 0 && (
              <div>
                <h4>You owe:</h4>
                {balance.owes.map((item, i) => (
                  <div key={i} style={{ color: '#dc3545' }}>
                    You owe {item.user.name} ${item.amount}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
        <Link to="/expenses/new">
          <button style={{
            padding: '10px 20px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Add Expense
          </button>
        </Link>
        <Link to="/groups/new">
          <button style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Create Group
          </button>
        </Link>
        <Link to="/settlements/new">
          <button style={{
            padding: '10px 20px',
            background: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Record Payment
          </button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Groups */}
        <div>
          <h3>Your Groups</h3>
          {groups.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No groups yet</p>
          ) : (
            <div>
              {groups.map((group: any) => (
                <Link
                  key={group.groups?.group_id}
                  to={`/groups/${group.groups?.group_id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    padding: '15px',
                    background: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    marginBottom: '10px',
                    cursor: 'pointer'
                  }}>
                    <strong>{group.groups?.name}</strong>
                    {group.groups?.description && (
                      <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                        {group.groups?.description}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
          <Link to="/groups">View all groups →</Link>
        </div>

        {/* Recent Expenses */}
        <div>
          <h3>Recent Expenses</h3>
          {recentExpenses.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No expenses yet</p>
          ) : (
            <div>
              {recentExpenses.map((expense) => (
                <div key={expense.expense_id} style={{
                  padding: '15px',
                  background: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{expense.description}</strong>
                    <span>${expense.amount}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
                    Paid by {expense.paid_by_user.name} on {new Date(expense.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link to="/expenses">View all expenses →</Link>
        </div>
      </div>
    </div>
  );
}