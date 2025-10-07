import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventsAPI, splitsAPI } from '../services/api';
import type { Event, Split } from '../types/index';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

type SortOption = 'date-newest' | 'date-oldest' | 'amount-high' | 'amount-low' | 'payer';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; splitId: string | null }>({ show: false, splitId: null });
  const [sortBy, setSortBy] = useState<SortOption>('date-newest');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      const [eventRes, splitsRes] = await Promise.all([
        eventsAPI.getById(id),
        splitsAPI.getAll({ event_id: id }),
      ]);

      // Attach participants to event object
      // Map users -> user for consistency
      const participantsWithUser = (eventRes.data.participants || []).map((p: any) => ({
        ...p,
        user: p.users || p.user
      }));
      const eventWithParticipants = {
        ...eventRes.data.event,
        participants: participantsWithUser
      };
      setEvent(eventWithParticipants);
      // Map API response to expected format (payer -> paid_by_user)
      const transformedSplits = (splitsRes.data.splits || []).map((split: any) => ({
        ...split,
        paid_by_user: split.payer || split.paid_by_user
      }));
      setSplits(transformedSplits);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSplit = async () => {
    if (!deleteModal.splitId) return;

    try {
      await splitsAPI.delete(deleteModal.splitId);
      setDeleteModal({ show: false, splitId: null });
      loadData();
    } catch (error) {
      console.error('Failed to delete bill:', error);
    }
  };

  const handleCopyShareLink = async () => {
    if (!event?.share_token) return;

    const shareUrl = `${window.location.origin}/join/${event.share_token}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus('Link copied!');
      setTimeout(() => setCopyStatus(''), 3000);
    } catch (error) {
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 3000);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;
  if (!event) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Event not found</div>;

  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const isCreator = event.created_by === user?.id;

  // Sort splits based on selected option
  const sortedSplits = [...splits].sort((a, b) => {
    switch (sortBy) {
      case 'date-newest':
        return new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime();
      case 'date-oldest':
        return new Date(a.date || a.created_at).getTime() - new Date(b.date || b.created_at).getTime();
      case 'amount-high':
        return b.amount - a.amount;
      case 'amount-low':
        return a.amount - b.amount;
      case 'payer':
        return (a.paid_by_user?.name || '').localeCompare(b.paid_by_user?.name || '');
      default:
        return 0;
    }
  });

  // Calculate balances (who owes whom)
  const balances: Record<string, number> = {};
  event.participants?.forEach(p => {
    balances[p.user_id] = 0;
  });

  splits.forEach(split => {
    const participants = split.split_participants || [];
    if (participants.length > 0) {
      const perPerson = split.amount / participants.length;
      // Person who paid gets credited
      balances[split.paid_by] = (balances[split.paid_by] || 0) + split.amount;
      // Each participant owes their share
      participants.forEach((p: any) => {
        balances[p.user_id] = (balances[p.user_id] || 0) - perPerson;
      });
    }
  });

  // Assign colors to participants (using approved palette)
  const participantColors = [
    colors.powderBlue,    // lightest
    colors.columbiaBlue,
    colors.dustyBlue,
    colors.lightBlue,
    colors.skyBlue,
    colors.steelBlue,
    colors.cadetGray,
    colors.stormGray,
    colors.cadetGray2,
    colors.cadetGray3,
    colors.slateGray,     // darkest
  ];

  const getParticipantColor = (userId: string) => {
    if (!event?.participants) return colors.surface;
    const index = event.participants.findIndex(p => p.user_id === userId);
    return index !== -1 ? participantColors[index % participantColors.length] : colors.surface;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Event Header */}
      <div style={{
        background: colors.surface,
        padding: '24px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 style={{ margin: '0 0 8px 0', color: colors.text, fontSize: '28px' }}>{event.name}</h1>
            {event.description && (
              <p style={{ color: colors.text, margin: '0', fontSize: '16px', opacity: 0.9 }}>
                {event.description}
              </p>
            )}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary }}>
            ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '14px', color: colors.text, opacity: 0.8, marginBottom: '8px' }}>
              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {event.participants.map((p) => (
                <span
                  key={p.user_id}
                  style={{
                    padding: '6px 12px',
                    background: getParticipantColor(p.user_id),
                    borderRadius: '6px',
                    fontSize: '16px',
                    color: '#000',
                    fontWeight: '500'
                  }}
                >
                  {p.user?.name}{p.user_id === user?.id ? ' (you)' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link to={`/events/${id}/splits/new`} style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '12px 24px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Add Bill
          </button>
        </Link>
        <button
          onClick={handleCopyShareLink}
          style={{
            padding: '12px 24px',
            background: colors.surface,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          Share Invite Link
        </button>
      </div>

      {/* Copy Status Message */}
      {copyStatus && (
        <div style={{
          padding: '12px 16px',
          background: copyStatus.includes('Failed') ? colors.error : colors.success,
          color: colors.text,
          borderRadius: '6px',
          marginBottom: '20px',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          {copyStatus}
        </div>
      )}

      {/* Balances Summary */}
      {splits.length > 0 && event.participants && event.participants.length > 1 && (
        <div style={{
          background: colors.surface,
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: '20px' }}>Balances</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {event.participants.map(p => {
              const balance = balances[p.user_id] || 0;
              const isCurrentUser = p.user_id === user?.id;
              return (
                <div key={p.user_id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: isCurrentUser ? getParticipantColor(p.user_id) : colors.background,
                  borderRadius: '6px',
                  border: isCurrentUser ? `2px solid ${colors.primary}` : 'none'
                }}>
                  <span style={{ fontSize: '16px', color: isCurrentUser ? '#000' : colors.text, fontWeight: isCurrentUser ? '600' : '500' }}>
                    {p.user?.name}{isCurrentUser ? ' (you)' : ''}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: balance > 0.01 ? '#22c55e' : balance < -0.01 ? '#ef4444' : (isCurrentUser ? '#000' : colors.text)
                  }}>
                    {balance > 0.01 ? `+$${balance.toFixed(2)}` : balance < -0.01 ? `-$${Math.abs(balance).toFixed(2)}` : '$0.00'}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: colors.text, opacity: 0.7, fontStyle: 'italic' }}>
            Positive balance = gets paid back, Negative balance = owes money
          </div>
        </div>
      )}

      {/* Bills Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ margin: 0, color: colors.text, fontSize: '20px' }}>Bills ({splits.length})</h2>
          {splits.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: colors.text }}>Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  background: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <option value="date-newest">Date (Newest)</option>
                <option value="date-oldest">Date (Oldest)</option>
                <option value="amount-high">Amount (High to Low)</option>
                <option value="amount-low">Amount (Low to High)</option>
                <option value="payer">Paid By (A-Z)</option>
              </select>
            </div>
          )}
        </div>
        {splits.length === 0 ? (
          <div style={{
            padding: '48px',
            background: colors.surface,
            border: `1px dashed ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.text,
            fontSize: '16px',
            opacity: 0.8
          }}>
            No bills yet. Add one to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sortedSplits.map((split) => (
              <div
                key={split.split_id}
                style={{
                  padding: '16px',
                  background: getParticipantColor(split.paid_by),
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong style={{ fontSize: '18px', color: '#000' }}>{split.title}</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#000', opacity: 0.9, marginBottom: '8px' }}>
                      <div>Total: ${split.amount.toFixed(2)}</div>
                      {split.split_participants && split.split_participants.length > 1 && (() => {
                        const perPersonAmount = split.amount / split.split_participants.length;
                        const currentUserParticipant = split.split_participants.find((p: any) => p.user_id === user?.id);

                        if (currentUserParticipant && split.paid_by !== user?.id) {
                          // Current user is a participant but didn't pay
                          return (
                            <div style={{ marginTop: '4px' }}>
                              {split.paid_by_user.name} paid ${split.amount.toFixed(2)}, <strong>you</strong> owe ${perPersonAmount.toFixed(2)}
                            </div>
                          );
                        }
                        return <div>Paid by {split.paid_by_user.name}</div>;
                      })()}
                      {(!split.split_participants || split.split_participants.length <= 1) && (
                        <div>Paid by {split.paid_by_user.name}</div>
                      )}
                    </div>
                    {split.notes && (
                      <div style={{ fontSize: '14px', color: '#000', marginTop: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '4px', fontStyle: 'italic' }}>
                        {split.notes}
                      </div>
                    )}
                  </div>
                  {(isCreator || split.created_by === user?.id) && (
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                      <Link to={`/events/${id}/splits/${split.split_id}/edit`} style={{ textDecoration: 'none' }}>
                        <button
                          style={{
                            padding: '8px 16px',
                            background: colors.surface,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ show: true, splitId: split.split_id })}
                        style={{
                          padding: '8px 16px',
                          background: colors.error,
                          color: colors.text,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.surface,
            padding: '24px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>Delete Bill?</h3>
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '16px', opacity: 0.9 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setDeleteModal({ show: false, splitId: null })}
                style={{
                  padding: '10px 20px',
                  background: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSplit}
                style={{
                  padding: '10px 20px',
                  background: colors.error,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
