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
  const [invites, setInvites] = useState<any[]>([]);
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

      // Load invites
      try {
        const invitesRes = await groupsAPI.getMyInvites();
        setInvites(invitesRes.data.invites || []);
      } catch (err) {
        console.log('No invites');
      }

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

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await groupsAPI.acceptInvite(inviteId);
      loadData(); // Reload to update groups and invites
    } catch (err) {
      console.error('Failed to accept invite:', err);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await groupsAPI.declineInvite(inviteId);
      loadData(); // Reload to update invites
    } catch (err) {
      console.error('Failed to decline invite:', err);
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

      {/* Group Invites */}
      {invites.length > 0 && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Group Invites ({invites.length})</h3>
          {invites.map((invite: any) => (
            <div key={invite.invite_id} style={{
              background: 'white',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{invite.inviter?.name}</strong> invited you to join{' '}
                <strong>{invite.groups?.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleAcceptInvite(invite.invite_id)}
                  style={{
                    padding: '6px 12px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.invite_id)}
                  style={{
                    padding: '6px 12px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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