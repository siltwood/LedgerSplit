import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventsAPI, splitsAPI, paymentsAPI, settledAPI } from '../services/api';
import type { Event, Split, EventSettledConfirmation } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; splitId: string | null }>({ show: false, splitId: null });
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [settledConfirmations, setSettledConfirmations] = useState<EventSettledConfirmation[]>([]);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);

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
      setSettledConfirmations(eventRes.data.settled_confirmations || []);
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
      setCopyStatus(`✓ Link copied!\n${shareUrl}`);
      setTimeout(() => setCopyStatus(''), 3500);
    } catch (error) {
      setCopyStatus('✗ Failed to copy link');
      setTimeout(() => setCopyStatus(''), 2500);
    }
  };

  const handleToggleSettledConfirmation = async () => {
    if (!id || !user) return;

    const isCurrentlyConfirmed = settledConfirmations.some(c => c.user_id === user.id);

    // Optimistically update UI
    if (isCurrentlyConfirmed) {
      setSettledConfirmations(settledConfirmations.filter(c => c.user_id !== user.id));
      if (event) {
        setEvent({ ...event, is_settled: false });
      }
    } else {
      setSettledConfirmations([...settledConfirmations, { event_id: id, user_id: user.id, confirmed_at: new Date().toISOString() }]);

      // Check if this completes all confirmations
      if (event && event.participants) {
        const newConfirmationCount = settledConfirmations.length + 1;
        if (newConfirmationCount === event.participants.length) {
          setEvent({ ...event, is_settled: true });
        }
      }
    }

    // Make API call in background
    try {
      await settledAPI.toggleConfirmation(id);
    } catch (error) {
      console.error('Failed to toggle settled confirmation:', error);
      // Reload on error to get correct state
      loadData();
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

  const handleDeleteEvent = async () => {
    if (!id) return;

    try {
      await eventsAPI.delete(id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
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
        {event.created_by === user?.id && (
          <button
            onClick={() => setShowDeleteEventModal(true)}
            style={{ ...buttonStyles.secondary, background: colors.error, border: 'none' }}
          >
            Delete Event
          </button>
        )}
      </div>

      {/* Settling Vote Section */}
      {event.participants && event.participants.length > 0 && splits.length > 0 && !event.is_settled && (
        <div style={{
          background: colors.surface,
          padding: '20px',
          borderRadius: '8px',
          border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ margin: 0, color: colors.text, fontSize: '22px' }}>
              {event.is_settled ? '✓ Event Settled!' : 'Settle Event'}
            </h3>
            {event.is_settled && (
              <span style={{
                padding: '8px 16px',
                background: colors.purple,
                color: '#fff',
                borderRadius: '20px',
                fontSize: '18px',
                fontWeight: '600'
              }}>
                All settled up!
              </span>
            )}
          </div>

          <div style={{ fontSize: '18px', color: colors.text, marginBottom: '16px', opacity: 0.9 }}>
            {event.is_settled
              ? 'Everyone has confirmed this event is settled.'
              : 'Once all participants confirm, this event will be marked as settled.'}
          </div>

          {/* Participant Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {event.participants.map((participant) => {
              const hasConfirmed = settledConfirmations.some(c => c.user_id === participant.user_id);
              const isCurrentUser = participant.user_id === user?.id;

              return (
                <div
                  key={participant.user_id}
                  onClick={isCurrentUser ? handleToggleSettledConfirmation : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: hasConfirmed ? colors.purple : colors.background,
                    borderRadius: '8px',
                    border: `2px solid ${hasConfirmed ? colors.purple : colors.border}`,
                    cursor: isCurrentUser ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    border: `2px solid ${hasConfirmed ? '#fff' : colors.border}`,
                    background: hasConfirmed ? colors.purple : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {hasConfirmed && (
                      <span style={{ color: '#fff', fontSize: '18px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '20px',
                    color: hasConfirmed ? '#fff' : colors.text,
                    fontWeight: hasConfirmed ? '600' : '500'
                  }}>
                    {participant.user?.name || participant.user?.email}
                    {isCurrentUser && ' (you)'}
                  </span>
                  {hasConfirmed && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '20px',
                      color: '#fff',
                      opacity: 0.9
                    }}>
                      Confirmed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '16px',
            fontSize: '20px',
            color: colors.text,
            opacity: 0.7,
            textAlign: 'center'
          }}>
            {settledConfirmations.length} of {event.participants.length} participants confirmed
          </div>
        </div>
      )}

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
          fontSize: '20px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease-out',
          whiteSpace: 'pre-line',
          maxWidth: '90%',
          wordBreak: 'break-all'
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
              <div style={{
                marginBottom: userSettlements.length > 0 ? '20px' : '0',
                padding: Math.abs(userBalance) < 0.01 ? '16px' : '0',
                background: Math.abs(userBalance) < 0.01 ? colors.purple : 'transparent',
                borderRadius: Math.abs(userBalance) < 0.01 ? '8px' : '0',
                textAlign: Math.abs(userBalance) < 0.01 ? 'center' : 'left'
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  color: Math.abs(userBalance) > 0.01 ? colors.purple : '#fff'
                }}>
                  {userBalance < -0.01 ? `You owe $${Math.abs(userBalance).toFixed(2)}` :
                   userBalance > 0.01 ? `People owe $${userBalance.toFixed(2)}` :
                   '✓ All settled up!'}
                </div>
              </div>

            {/* Settlement Actions */}
            {userSettlements.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '18px', color: colors.text, opacity: 0.8, marginBottom: '4px', fontStyle: 'italic' }}>
                  💡 Payments optimized to minimize transactions
                </div>
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
                        fontSize: '22px',
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
                        Mark as Paid
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
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '22px', color: '#000' }}>{split.title}</strong>
                      {(() => {
                        // Check if this split is settled for the current user
                        const perPersonAmount = split.split_participants && split.split_participants.length > 0
                          ? split.amount / split.split_participants.length
                          : 0;
                        const currentUserParticipant = split.split_participants?.find((p: any) => p.user_id === user?.id);

                        // If current user didn't pay and is a participant
                        if (split.paid_by !== user?.id && currentUserParticipant) {
                          // Check if there's a payment record for this
                          const hasPayment = payments.some((payment: any) =>
                            payment.from_user_id === user?.id &&
                            payment.to_user_id === split.paid_by &&
                            Math.abs(payment.amount - perPersonAmount) < 0.01
                          );

                          if (hasPayment) {
                            return (
                              <span style={{
                                padding: '4px 12px',
                                background: colors.purple,
                                color: '#fff',
                                borderRadius: '16px',
                                fontSize: '14px',
                                fontWeight: '600'
                              }}>
                                ✓ Settled
                              </span>
                            );
                          }
                        }
                        return null;
                      })()}
                    </div>
                    <div style={{ fontSize: '20px', color: '#000', opacity: 0.9, marginBottom: '8px' }}>
                      <div>Paid for by {split.paid_by === user?.id ? 'you' : (split.paid_by_user.name || split.paid_by_user.email)}</div>
                      <div>Total: ${split.amount.toFixed(2)}</div>
                      {split.split_participants && split.split_participants.length > 0 && (
                        <div>Split between {split.split_participants.length} {split.split_participants.length === 1 ? 'person' : 'people'}</div>
                      )}
                      {split.split_participants && split.split_participants.length > 1 && (() => {
                        const perPersonAmount = split.amount / split.split_participants.length;
                        const currentUserParticipant = split.split_participants.find((p: any) => p.user_id === user?.id);

                        if (split.paid_by === user?.id) {
                          // Current user paid - check who has paid them back
                          const whoOwes = split.split_participants
                            .filter((p: any) => p.user_id !== user?.id)
                            .map((p: any) => {
                              const hasPayment = payments.some((payment: any) =>
                                payment.from_user_id === p.user_id &&
                                payment.to_user_id === user?.id &&
                                Math.abs(payment.amount - perPersonAmount) < 0.01
                              );
                              return { participant: p, hasPaid: hasPayment };
                            });

                          const paidBackList = whoOwes.filter(w => w.hasPaid);
                          const stillOweList = whoOwes.filter(w => !w.hasPaid);

                          return (
                            <div style={{ marginTop: '4px', fontSize: '20px' }}>
                              {paidBackList.length > 0 && (
                                <div>
                                  {paidBackList.map(w => {
                                    const participant = event.participants?.find(ep => ep.user_id === w.participant.user_id);
                                    return (
                                      <div key={w.participant.user_id}>
                                        {participant?.user?.name || participant?.user?.email} paid you back ${perPersonAmount.toFixed(2)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {stillOweList.length > 0 && (
                                <div>
                                  {stillOweList.map(w => {
                                    const participant = event.participants?.find(ep => ep.user_id === w.participant.user_id);
                                    return (
                                      <div key={w.participant.user_id}>
                                        {participant?.user?.name || participant?.user?.email} owes ${perPersonAmount.toFixed(2)}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        } else if (currentUserParticipant) {
                          // Current user is a participant but didn't pay
                          return (
                            <div style={{ marginTop: '4px', fontSize: '20px' }}>
                              <strong style={{ fontWeight: '700', textDecoration: 'underline' }}>You owe</strong> ${perPersonAmount.toFixed(2)}
                            </div>
                          );
                        }
                        return null;
                      })()}
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
                        fontSize: '22px',
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

      {/* Delete Event Confirmation Modal */}
      {showDeleteEventModal && (
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
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>Delete Event?</h3>
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              This will permanently delete the event and all associated bills. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setShowDeleteEventModal(false)}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                style={{ ...buttonStyles.danger, border: 'none' }}
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
