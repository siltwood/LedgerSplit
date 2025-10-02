import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { splitsAPI, eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';

export default function CreateSplit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: eventIdFromParams } = useParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventIdFromParams) {
      loadEvent();
    }
  }, [eventIdFromParams]);

  const loadEvent = async () => {
    if (!eventIdFromParams) return;

    try {
      const eventRes = await eventsAPI.getById(eventIdFromParams);
      const loadedEvent = eventRes.data.event;
      setEvent(loadedEvent);

      // Auto-select all participants by default
      if (loadedEvent.participants) {
        setSelectedParticipants(loadedEvent.participants.map(p => p.user_id));
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      setError('Failed to load event. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!eventIdFromParams) {
      setError('Event ID not found');
      return;
    }

    if (!user) {
      setError('User not found');
      return;
    }

    // Allow creating splits with no participants (will be added when event participants are added later)

    setLoading(true);

    try {
      // Create the split with selected participants
      await splitsAPI.create({
        event_id: eventIdFromParams,
        title,
        amount: parseFloat(amount),
        paid_by: user.id,
        date: new Date().toISOString().split('T')[0],
        participant_ids: selectedParticipants,
      });

      navigate(`/events/${eventIdFromParams}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create split');
    } finally {
      setLoading(false);
    }
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  if (!event && !error) {
    return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '700px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: colors.text }}>New Split</h1>
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
    <div style={{ maxWidth: '700px', padding: '20px' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>New Split for {event.name}</h1>

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

      <div style={{
        padding: '15px',
        background: colors.surfaceLight,
        borderRadius: '4px',
        marginBottom: '20px',
        fontSize: '14px',
        color: colors.text
      }}>
        Select which participants to include in this split. The amount will be divided equally among selected participants.
      </div>

      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Title *
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {event.participants && event.participants.map((participant) => (
              <label
                key={participant.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: colors.surface,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: `2px solid ${selectedParticipants.includes(participant.user_id) ? colors.primary : colors.border}`
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(participant.user_id)}
                  onChange={() => toggleParticipant(participant.user_id)}
                  style={{
                    cursor: 'pointer',
                    width: '20px',
                    height: '20px'
                  }}
                />
                <span style={{ color: colors.text, fontSize: '14px' }}>
                  {participant.user?.name}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={{
          background: colors.surfaceLight,
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '16px', color: colors.text }}>
            <strong>Summary:</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>Paid by: You ({user?.name})</li>
              <li>Date: Today</li>
              <li>Split equally among {selectedParticipants.length} selected participant{selectedParticipants.length !== 1 ? 's' : ''}</li>
              <li>Each owes: ${selectedParticipants.length > 0 && amount ? (parseFloat(amount) / selectedParticipants.length).toFixed(2) : '0.00'}</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px',
              fontSize: '16px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Split'}
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
