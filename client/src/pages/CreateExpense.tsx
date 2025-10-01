import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expensesAPI, groupsAPI, friendsAPI } from '../services/api';
import type { Group, Friend } from '../types/index';

type SplitType = 'equal' | 'exact' | 'percentages' | 'shares';

export default function CreateExpense() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [groupId, setGroupId] = useState('');
  const [paidBy, setPaidBy] = useState(user?.id || '');

  const [groups, setGroups] = useState<Group[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([user?.id || '']);

  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<{ [userId: string]: number }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setPaidBy(user.id);
      setSelectedUsers([user.id]);
    }
  }, [user]);

  useEffect(() => {
    calculateSplits();
  }, [amount, selectedUsers, splitType]);

  const loadData = async () => {
    try {
      const [groupsRes, friendsRes] = await Promise.all([
        groupsAPI.getAll(),
        friendsAPI.getAll(),
      ]);

      const loadedGroups = groupsRes.data.groups.map((g: any) => g.groups);
      setGroups(loadedGroups);
      setFriends(friendsRes.data.friends);

      // Build available users list
      const users = [
        { user_id: user?.id, name: user?.name, email: user?.email },
        ...friendsRes.data.friends.map((f: any) => f.friend),
      ];
      setAvailableUsers(users);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const calculateSplits = () => {
    if (!amount || selectedUsers.length === 0) return;

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount)) return;

    if (splitType === 'equal') {
      const perPerson = totalAmount / selectedUsers.length;
      const newSplits: { [key: string]: number } = {};
      selectedUsers.forEach((userId) => {
        newSplits[userId] = parseFloat(perPerson.toFixed(2));
      });
      setSplits(newSplits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const splitsArray = selectedUsers.map((userId) => ({
        user_id: userId,
        amount_owed: splits[userId] || 0,
      }));

      const totalSplit = splitsArray.reduce((sum, s) => sum + s.amount_owed, 0);
      if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        setError('Splits must sum to total amount');
        setLoading(false);
        return;
      }

      await expensesAPI.create({
        group_id: groupId || undefined,
        description,
        amount: parseFloat(amount),
        paid_by: paidBy,
        date,
        notes: notes || undefined,
        splits: splitsArray,
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const updateSplit = (userId: string, value: number) => {
    setSplits({ ...splits, [userId]: value });
  };

  return (
    <div style={{ maxWidth: '700px', margin: '50px auto', padding: '20px' }}>
      <h1>Add Expense</h1>

      {error && (
        <div style={{
          padding: '10px',
          background: '#fee',
          color: '#c00',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description *
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            placeholder="Dinner, Uber, etc."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Amount *
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Group (Optional)
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="">No group</option>
            {groups.map((group) => (
              <option key={group.group_id} value={group.group_id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Paid by *
          </label>
          <select
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            {availableUsers.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Split with *
          </label>
          <div style={{
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '10px',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            {availableUsers.map((u) => (
              <div key={u.user_id} style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.user_id)}
                    onChange={() => toggleUser(u.user_id)}
                    style={{ marginRight: '8px' }}
                  />
                  {u.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Split type
          </label>
          <select
            value={splitType}
            onChange={(e) => setSplitType(e.target.value as SplitType)}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            <option value="equal">Split equally</option>
            <option value="exact">Enter exact amounts</option>
          </select>
        </div>

        {splitType === 'exact' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Amounts
            </label>
            {selectedUsers.map((userId) => {
              const user = availableUsers.find((u) => u.user_id === userId);
              return (
                <div key={userId} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ flex: 1 }}>{user?.name}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={splits[userId] || 0}
                    onChange={(e) => updateSplit(userId, parseFloat(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '8px',
                      fontSize: '16px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}

        {splitType === 'equal' && splits && (
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <strong>Split preview:</strong>
            {selectedUsers.map((userId) => {
              const user = availableUsers.find((u) => u.user_id === userId);
              return (
                <div key={userId} style={{ marginTop: '8px' }}>
                  {user?.name}: ${(splits[userId] || 0).toFixed(2)}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={2}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating...' : 'Add Expense'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              background: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}