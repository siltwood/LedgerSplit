import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { eventsAPI, splitsAPI, paymentsAPI } from '../services/api';
import type { Event, Split } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; splitId: string | null }>({ show: false, splitId: null });
  const [showAllBalances, setShowAllBalances] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      const [eventRes, splitsRes, paymentsRes] = await Promise.all([
        eventsAPI.getById(id),
        splitsAPI.getAll({ event_id: id }),
        paymentsAPI.getAll({ event_id: id }),
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
      setPayments(paymentsRes.data.payments || []);
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
      setCopyStatus('✓ Link copied to clipboard!');
      setTimeout(() => setCopyStatus(''), 2500);
    } catch (error) {
      setCopyStatus('✗ Failed to copy link');
      setTimeout(() => setCopyStatus(''), 2500);
    }
  };

  const handleMarkAsPaid = async (settlement: { from: string; to: string; amount: number }) => {
    if (!id) return;

    try {
      await paymentsAPI.create({
        event_id: id,
        from_user_id: settlement.from,
        to_user_id: settlement.to,
        amount: settlement.amount,
      });
      loadData(); // Reload to update balances
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}></div>;
  if (!event) return <div style={{ padding: '20px', color: colors.text, fontSize: '20px' }}>Event not found</div>;

  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);

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

  // Account for payments (subtract from balances)
  payments.forEach(payment => {
    // Person who paid reduces their debt (increases balance)
    balances[payment.from_user_id] = (balances[payment.from_user_id] || 0) + payment.amount;
    // Person who received decreases their credit (decreases balance)
    balances[payment.to_user_id] = (balances[payment.to_user_id] || 0) - payment.amount;
  });

  // Calculate optimal settle up transactions
  interface Settlement {
    from: string;
    to: string;
    amount: number;
  }

  const calculateSettlements = (): Settlement[] => {
    const settlements: Settlement[] = [];
    const balancesCopy = { ...balances };

    // Get creditors (people owed money) and debtors (people who owe)
    const creditors = Object.entries(balancesCopy).filter(([_, amt]) => amt > 0.01);
    const debtors = Object.entries(balancesCopy).filter(([_, amt]) => amt < -0.01);

    // Greedy algorithm: match largest debtor with largest creditor
    let creditorIdx = 0;
    let debtorIdx = 0;

    while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
      const [creditorId, creditorAmt] = creditors[creditorIdx];
      const [debtorId, debtorAmt] = debtors[debtorIdx];

      const settleAmount = Math.min(creditorAmt, Math.abs(debtorAmt));

      if (settleAmount > 0.01) {
        settlements.push({
          from: debtorId,
          to: creditorId,
          amount: settleAmount
        });

        creditors[creditorIdx][1] -= settleAmount;
        debtors[debtorIdx][1] += settleAmount;
      }

      if (Math.abs(creditors[creditorIdx][1]) < 0.01) creditorIdx++;
      if (Math.abs(debtors[debtorIdx][1]) < 0.01) debtorIdx++;
    }

    return settlements;
  };

  const settlements = calculateSettlements();

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
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Event Header */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 style={{ margin: '0 0 8px 0', color: colors.text, fontSize: '28px' }}>{event.name}</h1>
            {event.description && (
              <p style={{ color: colors.text, margin: '0', fontSize: '20px', opacity: 0.9 }}>
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
            <div style={{ fontSize: '20px', color: colors.text, opacity: 0.8, marginBottom: '8px' }}>
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
                    fontSize: '20px',
                    color: '#000',
                    fontWeight: '500',
                    wordBreak: 'break-word'
                  }}
                >
                  {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link to={`/events/${id}/splits/new`} style={{ textDecoration: 'none' }}>
          <button style={buttonStyles.primary}>
            Add Bill
          </button>
        </Link>
        <button onClick={handleCopyShareLink} style={buttonStyles.secondary}>
          Share Invite Link
        </button>
      </div>

      {/* Toast Notification for Copy Status */}
      {copyStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          background: copyStatus.includes('✗') ? colors.error : colors.purple,
          color: '#fff',
          borderRadius: '8px',
          fontSize: '18px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out'
        }}>
          {copyStatus}
        </div>
      )}

      {/* Your Balance Card - Priority Section */}
      {splits.length > 0 && event.participants && event.participants.length > 1 && (() => {
        const userBalance = balances[user?.id || ''] || 0;
        const userSettlements = settlements.filter(s => s.from === user?.id || s.to === user?.id);

        if (Math.abs(userBalance) < 0.01 && userSettlements.length === 0) return null;

        return (
          <>
            <h2 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: '20px' }}>Your Balance</h2>
            <div style={{
              background: colors.surface,
              padding: '20px',
              borderRadius: '8px',
              border: `2px solid ${Math.abs(userBalance) > 0.01 ? colors.purple : colors.border}`,
              marginBottom: '24px'
            }}>
              {/* Big Balance Display */}
              <div style={{ marginBottom: userSettlements.length > 0 ? '20px' : '0' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: Math.abs(userBalance) > 0.01 ? colors.purple : colors.text
                }}>
                  {userBalance < -0.01 ? `You owe $${Math.abs(userBalance).toFixed(2)}` :
                   userBalance > 0.01 ? `People owe $${userBalance.toFixed(2)}` :
                   'All settled up!'}
                </div>
              </div>

            {/* Settlement Actions */}
            {userSettlements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {userSettlements.map((settlement, idx) => {
                  const fromUser = event.participants?.find(p => p.user_id === settlement.from);
                  const toUser = event.participants?.find(p => p.user_id === settlement.to);
                  const isUserPaying = settlement.from === user?.id;

                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: colors.background,
                      borderRadius: '6px',
                      border: `1px solid ${colors.border}`,
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: 1, fontSize: '20px', color: '#000', fontWeight: '600', wordBreak: 'break-word', minWidth: '150px' }}>
                        {isUserPaying ? (
                          <>Pay {toUser?.user?.name || toUser?.user?.email}</>
                        ) : (
                          <>{fromUser?.user?.name || fromUser?.user?.email} pays you</>
                        )}
                      </div>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: colors.purple,
                        minWidth: '70px',
                        textAlign: 'right',
                        flexShrink: 0
                      }}>
                        ${settlement.amount.toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleMarkAsPaid(settlement)}
                        style={{
                          ...buttonStyles.small,
                          background: colors.primary,
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Paid
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </>
        );
      })()}

      {/* Bills Section */}
      <div>
        <h2 style={{ margin: '0 0 16px 0', color: colors.text, fontSize: '20px' }}>Bills ({splits.length})</h2>
        {splits.length === 0 ? (
          <div style={{
            padding: '48px',
            background: colors.surface,
            border: `1px dashed ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.text,
            fontSize: '20px',
            opacity: 0.8
          }}>
            No bills yet. Add one to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {splits.map((split) => (
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
                    <div style={{ fontSize: '20px', color: '#000', opacity: 0.9, marginBottom: '8px' }}>
                      <div>Total: ${split.amount.toFixed(2)}</div>
                      {split.split_participants && split.split_participants.length > 0 && (
                        <div>Split between {split.split_participants.length} {split.split_participants.length === 1 ? 'person' : 'people'}</div>
                      )}
                      {split.split_participants && split.split_participants.length > 1 && (() => {
                        const perPersonAmount = split.amount / split.split_participants.length;
                        const currentUserParticipant = split.split_participants.find((p: any) => p.user_id === user?.id);

                        if (split.paid_by === user?.id) {
                          // Current user paid
                          return <div>Paid by {split.paid_by_user.name || split.paid_by_user.email} (you)</div>;
                        } else if (currentUserParticipant) {
                          // Current user is a participant but didn't pay
                          return (
                            <div style={{ marginTop: '4px', fontSize: '20px' }}>
                              {split.paid_by_user.name || split.paid_by_user.email} paid ${split.amount.toFixed(2)}, <strong style={{ fontWeight: '700', textDecoration: 'underline' }}>you owe</strong> ${perPersonAmount.toFixed(2)}
                            </div>
                          );
                        }
                        return <div>Paid by {split.paid_by_user.name || split.paid_by_user.email}</div>;
                      })()}
                      {(!split.split_participants || split.split_participants.length <= 1) && (
                        <div>Paid by {split.paid_by_user.name || split.paid_by_user.email}{split.paid_by === user?.id ? ' (you)' : ''}</div>
                      )}
                    </div>
                    {split.notes && (
                      <div style={{ fontSize: '20px', color: '#000', marginTop: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.3)', borderRadius: '4px', fontStyle: 'italic' }}>
                        {split.notes}
                      </div>
                    )}
                  </div>
                  {(split.created_by === user?.id) && (
                    <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                      <Link to={`/events/${id}/splits/${split.split_id}/edit`} style={{ textDecoration: 'none' }}>
                        <button style={buttonStyles.small}>
                          Edit
                        </button>
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ show: true, splitId: split.split_id })}
                        style={{ ...buttonStyles.small, background: colors.error, border: 'none' }}
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

      {/* Collapsible All Balances Section */}
      {splits.length > 0 && event.participants && event.participants.length > 1 && (
        <div style={{ marginBottom: '24px', marginTop: '24px' }}>
          <button
            onClick={() => setShowAllBalances(!showAllBalances)}
            style={{ ...buttonStyles.small, textAlign: 'left', display: 'inline-block' }}
          >
            {showAllBalances ? 'Hide all balances' : 'See all balances'}
          </button>
          {showAllBalances && (
            <div style={{
              background: colors.surface,
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
              marginTop: '12px'
            }}>
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
                      border: isCurrentUser ? `2px solid ${colors.primary}` : 'none',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '20px', color: isCurrentUser ? '#000' : colors.text, fontWeight: isCurrentUser ? '600' : '500', wordBreak: 'break-word' }}>
                        {p.user?.name || p.user?.email}{isCurrentUser ? ' (you)' : ''}
                      </span>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: Math.abs(balance) > 0.01 ? colors.purple : (isCurrentUser ? '#000' : colors.text)
                      }}>
                        {(() => {
                          if (balance > 0.01) {
                            return isCurrentUser ? `People owe $${balance.toFixed(2)}` : `People owe $${balance.toFixed(2)}`;
                          } else if (balance < -0.01) {
                            return isCurrentUser ? `You owe $${Math.abs(balance).toFixed(2)}` : `Owes $${Math.abs(balance).toFixed(2)}`;
                          }
                          return '$0.00';
                        })()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

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
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setDeleteModal({ show: false, splitId: null })}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSplit}
                style={{ ...buttonStyles.danger, border: 'none' }}
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
