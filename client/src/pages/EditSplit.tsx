import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { splitsAPI, eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';

export default function EditSplit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: eventIdFromParams, splitId } = useParams<{ id: string; splitId: string }>();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventIdFromParams && splitId) {
      loadData();
    }
  }, [eventIdFromParams, splitId]);

  const loadData = async () => {
    if (!eventIdFromParams || !splitId) return;

    try {
      const [eventRes, splitRes] = await Promise.all([
        eventsAPI.getById(eventIdFromParams),
        splitsAPI.getAll({ event_id: eventIdFromParams })
      ]);

      // Attach participants to event object and map user data
      const participantsWithUser = (eventRes.data.participants || []).map((p: any) => ({
        ...p,
        user: p.users || p.user
      }));
      const loadedEvent = {
        ...eventRes.data.event,
        participants: participantsWithUser
      };
      setEvent(loadedEvent);

      // Find the split we're editing
      const splitToEdit = (splitRes.data.splits || []).find((s: any) => s.split_id === splitId);

      if (splitToEdit) {
        setTitle(splitToEdit.title);
        setAmount(splitToEdit.amount.toString());

        // Set selected participants from split_participants
        if (splitToEdit.split_participants && splitToEdit.split_participants.length > 0) {
          setSelectedParticipants(splitToEdit.split_participants.map((p: any) => p.user_id));
        } else if (user) {
          setSelectedParticipants([user.id]);
        }
      } else {
        setError('Bill not found');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Failed to load bill. Please try again.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!eventIdFromParams || !splitId) {
      setError('Missing required information');
      return;
    }

    if (!user) {
      setError('User not found');
      return;
    }

    setLoading(true);

    try {
      await splitsAPI.update(splitId, {
        title,
        amount: parseFloat(amount),
        participant_ids: selectedParticipants,
      });

      navigate(`/events/${eventIdFromParams}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update bill');
    } finally {
      setLoading(false);
    }
  };


  if (loadingData) {
    return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '700px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: colors.text }}>Edit Bill</h1>
        <div style={{
          padding: '20px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {error || 'Event not found'}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '12px 24px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Edit Bill for {event.name}</h1>

      {error && (
        <div style={{
          padding: '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Description *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Dinner, Uber, Concert tickets, etc."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
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
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Split between *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {event.participants?.map((p: any) => {
              const isSelected = selectedParticipants.includes(p.user_id);
              const isCurrentUser = p.user_id === user?.id;
              return (
                <label
                  key={p.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    background: isSelected ? colors.columbiaBlue : colors.surface,
                    border: `1px solid ${isSelected ? colors.primary : colors.border}`,
                    borderRadius: '6px',
                    cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isCurrentUser ? 0.6 : 1
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isCurrentUser}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedParticipants([...selectedParticipants, p.user_id]);
                      } else {
                        setSelectedParticipants(selectedParticipants.filter(id => id !== p.user_id));
                      }
                    }}
                    style={{
                      marginRight: '12px',
                      width: '20px',
                      height: '20px',
                      cursor: isCurrentUser ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span style={{ color: colors.text, fontSize: '16px' }}>
                    {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                  </span>
                </label>
              );
            })}
          </div>
          {selectedParticipants.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '14px', color: colors.text, opacity: 0.7 }}>
              ${parseFloat(amount || '0').toFixed(2)} ÷ {selectedParticipants.length} = ${(parseFloat(amount || '0') / selectedParticipants.length).toFixed(2)} per person
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/events/${eventIdFromParams}`)}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              background: colors.textSecondary,
              color: colors.text,
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
