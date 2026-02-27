import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { splitsAPI, eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT } from '../styles/constants';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      navigate('/login');
      return;
    }

    if (eventIdFromParams) {
      loadEvent();
    }
  }, [eventIdFromParams, user, navigate]);

  const loadEvent = async () => {
    if (!eventIdFromParams) return;

    try {
      const eventRes = await eventsAPI.getById(eventIdFromParams);

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

      // Auto-select all participants by default
      setSelectedParticipants(participantsWithUser.map((p: any) => p.user_id));
    } catch (error) {
      console.error('Failed to load event:', error);
      setError('Failed to load event. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!eventIdFromParams) {
      setError('Event ID not found.');
      return;
    }

    if (!user) {
      setError('User not found.');
      return;
    }

    setLoading(true);

    try {
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
      setError(err.response?.data?.error || 'Failed to create bill.');
    } finally {
      setLoading(false);
    }
  };


  if (!event && !error) {
    return <div style={{ padding: '20px' }}></div>;
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '700px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: colors.text }}>New Bill</h1>
        <div style={{
          padding: '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '20px',
          fontSize: typography.getFontSize('h2', isMobile),
          fontWeight: LABEL_FONT_WEIGHT,
          textAlign: 'center'
        }}>
          {error || 'Event not found'}
        </div>
        <Link to="/dashboard" style={{ textDecoration: 'underline', color: colors.text, fontSize: typography.getFontSize('body', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
          Go to <span style={{ textDecoration: 'underline' }}>Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '16px', fontSize: typography.getFontSize('h1', isMobile) }}>New Bill for {event.name}</h1>

      {error && (
        <div style={{
          padding: '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '20px',
          fontSize: typography.getFontSize('body', isMobile)
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Description *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{
              width: '100%',
              padding: INPUT_PADDING,
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: BORDER_RADIUS,
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Amount *
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            style={{
              width: '100%',
              padding: INPUT_PADDING,
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: BORDER_RADIUS,
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Bill shared between *
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {event.participants?.sort((a: any, b: any) => {
              // Current user always first
              if (a.user_id === user?.id) return -1;
              if (b.user_id === user?.id) return 1;
              return 0;
            }).map((p: any) => {
              const isSelected = selectedParticipants.includes(p.user_id);
              const isCurrentUser = p.user_id === user?.id;
              return (
                <div
                  key={p.user_id}
                  onClick={() => {
                    if (!isCurrentUser) {
                      if (isSelected) {
                        setSelectedParticipants(selectedParticipants.filter(id => id !== p.user_id));
                      } else {
                        setSelectedParticipants([...selectedParticipants, p.user_id]);
                      }
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: isSelected ? colors.purple : colors.background,
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? colors.purple : colors.border}`,
                    cursor: isCurrentUser ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isCurrentUser ? 0.7 : 1
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: BORDER_RADIUS,
                    border: `2px solid ${isSelected ? '#fff' : colors.border}`,
                    background: isSelected ? colors.purple : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <span style={{ color: '#fff', fontSize: typography.getFontSize('body', isMobile), fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '16px',
                    color: isSelected ? '#fff' : colors.text,
                    fontWeight: isSelected ? '600' : '500'
                  }}>
                    {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          {selectedParticipants.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: typography.getFontSize('body', isMobile), color: colors.text, opacity: 0.7 }}>
              ${parseFloat(amount || '0').toFixed(2)} ÷ {selectedParticipants.length} = ${(parseFloat(amount || '0') / selectedParticipants.length).toFixed(2)} per person
            </div>
          )}
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: BORDER_RADIUS,
            fontSize: isMobile ? '13px' : '14px',
            color: colors.text,
            opacity: 0.9,
            lineHeight: '1.4'
          }}>
            <strong style={{ fontWeight: LABEL_FONT_WEIGHT }}>Note:</strong> New members added later will be included in this split automatically.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyles.primary,
              ...getResponsiveButtonWidth(isMobile),
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Add Bill
          </button>
          <button
            type="button"
            onClick={() => navigate(`/events/${eventIdFromParams}`)}
            style={{
              ...buttonStyles.secondary,
              ...getResponsiveButtonWidth(isMobile)
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
