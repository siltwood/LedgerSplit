import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { splitsAPI, eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT } from '../styles/constants';

export default function EditSplit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: eventIdFromParams, splitId } = useParams<{ id: string; splitId: string }>();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('');
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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

    if (eventIdFromParams && splitId) {
      loadData();
    }
  }, [eventIdFromParams, splitId, user, navigate]);

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
        setCategory(splitToEdit.category || '');

        // Set selected participants from split_participants
        if (splitToEdit.split_participants && splitToEdit.split_participants.length > 0) {
          setSelectedParticipants(splitToEdit.split_participants.map((p: any) => p.user_id));
        } else if (user) {
          setSelectedParticipants([user.id]);
        }
      } else {
        setError('Bill not found.');
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
      setError('Missing required information.');
      return;
    }

    if (!user) {
      setError('User not found.');
      return;
    }

    setLoading(true);

    try {
      await splitsAPI.update(splitId, {
        title,
        amount: parseFloat(amount),
        category: category || undefined,
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
    return <div style={{ padding: '20px' }}></div>;
  }

  if (!event) {
    return (
      <div style={{ maxWidth: '700px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: colors.text }}>Edit Bill</h1>
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
      <h1 style={{ color: colors.text, marginBottom: '16px', fontSize: typography.getFontSize('h1', isMobile) }}>Edit Bill for {event.name}</h1>

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
            step="0.01"
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

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Category (optional)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
            gap: '8px'
          }}>
            {[
              { value: 'food', label: 'Food' },
              { value: 'transportation', label: 'Transport' },
              { value: 'lodging', label: 'Lodging' },
              { value: 'entertainment', label: 'Fun' },
              { value: 'groceries', label: 'Groceries' },
              { value: 'other', label: 'Other' }
            ].map(cat => (
              <div
                key={cat.value}
                onClick={() => setCategory(category === cat.value ? '' : cat.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  background: colors.surface,
                  borderRadius: '6px',
                  border: `2px solid ${category === cat.value ? colors.purple : colors.border}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: `2px solid ${category === cat.value ? colors.purple : colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {category === cat.value && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: colors.purple
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: typography.getFontSize('bodySmall', isMobile),
                  color: colors.text,
                  fontWeight: category === cat.value ? '600' : '500'
                }}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Split between *
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
            Save Changes
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
