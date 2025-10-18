import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventsAPI, splitsAPI, paymentsAPI, settledAPI } from '../services/api';
import type { Event, Split, EventSettledConfirmation } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth, getResponsiveCardWidth } from '../styles/buttons';
import { useAuth } from '../context/AuthContext';
import Caret from '../components/Caret';

const BILLS_PER_PAGE = 5;

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
  const [showAllBalances] = useState(true);
  const [settledConfirmations, setSettledConfirmations] = useState<EventSettledConfirmation[]>([]);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [showLeaveEventModal, setShowLeaveEventModal] = useState(false);
  const [removeParticipantModal, setRemoveParticipantModal] = useState<{ show: boolean; userId: string | null; userName: string | null }>({ show: false, userId: null, userName: null });
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('date-newest');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [billsPage, setBillsPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [id]);

  // Reset to page 1 when search/filter/sort changes
  useEffect(() => {
    setBillsPage(1);
  }, [billSearchQuery, sortBy, filterBy]);

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
    } catch (error: any) {
      console.error('Failed to load event:', error);

      // Handle 403 (kicked from event) or 404 (event deleted)
      if (error?.response?.status === 403) {
        setCopyStatus('✗ You were removed from this event');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else if (error?.response?.status === 404) {
        setCopyStatus('✗ This event was deleted');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
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
    } catch (error: any) {
      console.error('Failed to delete bill:', error);
      setDeleteModal({ show: false, splitId: null });

      // Handle 403 (kicked from event) or 404 (event deleted)
      if (error?.response?.status === 403) {
        setCopyStatus('✗ You were removed from this event');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else if (error?.response?.status === 404) {
        setCopyStatus('✗ This event was deleted');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setCopyStatus('✗ Failed to delete bill');
        setTimeout(() => setCopyStatus(''), 2500);
      }
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
    } catch (error: any) {
      console.error('Failed to toggle settled confirmation:', error);

      // Handle 403 (kicked from event) or 404 (event deleted)
      if (error?.response?.status === 403) {
        setCopyStatus('✗ You were removed from this event');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else if (error?.response?.status === 404) {
        setCopyStatus('✗ This event was deleted');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // Reload on other errors to get correct state
        loadData();
      }
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

  const handleLeaveEvent = async () => {
    if (!id) return;

    try {
      await eventsAPI.leaveEvent(id);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to leave event:', error);
      alert('Failed to leave event');
    }
  };

  const handleRemoveParticipant = async () => {
    if (!id || !removeParticipantModal.userId) return;

    try {
      await eventsAPI.removeParticipant(id, removeParticipantModal.userId);
      setRemoveParticipantModal({ show: false, userId: null, userName: null });
      loadData();
    } catch (error) {
      console.error('Failed to remove participant:', error);
      alert('Failed to remove participant');
    }
  };

  const toggleBillExpanded = (billId: string) => {
    setExpandedBills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
    });
  };

  const toggleAllBills = () => {
    if (expandedBills.size === splits.length) {
      // All expanded, collapse all
      setExpandedBills(new Set());
    } else {
      // Some or none expanded, expand all
      setExpandedBills(new Set(splits.map(s => s.split_id)));
    }
  };

  if (loading) return <div style={{ padding: '20px' }}></div>;
  if (!event) {
    // If event is null after loading, redirect to dashboard
    navigate('/dashboard');
    return <div style={{ padding: '20px' }}></div>;
  }

  const isMobile = window.innerWidth < 600;
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

  const getCategoryLabel = (category?: string) => {
    const categoryMap: Record<string, string> = {
      'food': 'Food',
      'transportation': 'Transport',
      'lodging': 'Lodging',
      'entertainment': 'Fun',
      'groceries': 'Groceries',
      'other': 'Other'
    };
    return category ? categoryMap[category] || category : null;
  };

  // Filter and sort bills
  const filteredBills = splits
    .filter(split => {
      // Apply filter
      if (filterBy === 'all') return true;
      if (filterBy === 'my-bills') return split.created_by === user?.id;
      if (filterBy === 'i-owe') {
        return split.paid_by !== user?.id && split.split_participants?.some((p: any) => p.user_id === user?.id);
      }
      if (filterBy === 'i-paid') return split.paid_by === user?.id;
      if (filterBy.startsWith('cat-')) {
        const category = filterBy.replace('cat-', '');
        if (category === 'uncategorized') return !split.category;
        return split.category === category;
      }
      return true;
    })
    .filter(split => {
      // Apply search filter
      if (!billSearchQuery.trim()) return true;
      const query = billSearchQuery.toLowerCase();

      // Check for "me", "you", "my bills" keywords to show user's bills
      if (query === 'me' || query === 'you' || query === 'my bills') {
        return split.created_by === user?.id;
      }

      // Search in title
      if (split.title.toLowerCase().includes(query)) return true;

      // Search in payer name
      if (split.paid_by_user?.name?.toLowerCase().includes(query)) return true;
      if (split.paid_by_user?.email?.toLowerCase().includes(query)) return true;

      // Search in notes
      if (split.notes?.toLowerCase().includes(query)) return true;

      // Search in participant names
      if (split.split_participants?.some((p: any) => {
        const participant = event?.participants?.find(ep => ep.user_id === p.user_id);
        return participant?.user?.name?.toLowerCase().includes(query) ||
               participant?.user?.email?.toLowerCase().includes(query);
      })) return true;

      return false;
    })
    .sort((a, b) => {
      // Apply sort
      if (sortBy === 'date-newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date-oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'amount-high') {
        return b.amount - a.amount;
      }
      if (sortBy === 'amount-low') {
        return a.amount - b.amount;
      }
      if (sortBy === 'category') {
        const catA = a.category || 'zzz'; // Put uncategorized at end
        const catB = b.category || 'zzz';
        return catA.localeCompare(catB);
      }
      if (sortBy === 'creator') {
        const creatorA = event?.participants?.find(p => p.user_id === a.created_by);
        const creatorB = event?.participants?.find(p => p.user_id === b.created_by);
        const nameA = creatorA?.user?.name || creatorA?.user?.email || '';
        const nameB = creatorB?.user?.name || creatorB?.user?.email || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  // Pagination
  const totalBillsPages = Math.ceil(filteredBills.length / BILLS_PER_PAGE);
  const billsStartIndex = (billsPage - 1) * BILLS_PER_PAGE;
  const billsEndIndex = billsStartIndex + BILLS_PER_PAGE;
  const paginatedBills = filteredBills.slice(billsStartIndex, billsEndIndex);

  const goToBillsPage = (page: number) => {
    setBillsPage(page);
    // Scroll to bills section
    document.getElementById('bills-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Event Header */}
      <div style={{
        background: colors.surface,
        padding: window.innerWidth < 600 ? '12px' : '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: window.innerWidth < 600 ? '16px' : '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: window.innerWidth < 600 ? '8px' : '16px', marginBottom: window.innerWidth < 600 ? '8px' : '16px' }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <h1 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: window.innerWidth < 600 ? '22px' : '28px' }}>{event.name}</h1>
            {event.description && (
              <p style={{ color: colors.text, margin: '0', fontSize: window.innerWidth < 600 ? '16px' : '20px', opacity: 0.9 }}>
                {event.description}
              </p>
            )}
          </div>
          <div style={{ fontSize: window.innerWidth < 600 ? '20px' : '24px', fontWeight: 'bold', color: colors.primary }}>
            ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <div style={{ marginTop: window.innerWidth < 600 ? '12px' : '20px', paddingTop: window.innerWidth < 600 ? '12px' : '20px', borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: window.innerWidth < 600 ? '16px' : '20px', color: colors.text, opacity: 0.8, marginBottom: window.innerWidth < 600 ? '6px' : '8px' }}>
              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: window.innerWidth < 600 ? '6px' : '8px' }}>
              {event.participants.map((p) => {
                const isCreator = event.created_by === user?.id;
                const isParticipantCreator = p.user_id === event.created_by;
                const canRemove = isCreator && !isParticipantCreator;

                return (
                  <span
                    key={p.user_id}
                    style={{
                      padding: window.innerWidth < 600 ? '4px 8px' : '6px 12px',
                      paddingRight: canRemove ? (window.innerWidth < 600 ? '24px' : '28px') : (window.innerWidth < 600 ? '8px' : '12px'),
                      background: getParticipantColor(p.user_id),
                      borderRadius: '6px',
                      fontSize: window.innerWidth < 600 ? '16px' : '20px',
                      color: '#000',
                      fontWeight: '500',
                      wordBreak: 'break-word',
                      display: 'inline-block',
                      position: 'relative'
                    }}
                  >
                    {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                    {canRemove && (
                      <button
                        onClick={() => setRemoveParticipantModal({ show: true, userId: p.user_id, userName: p.user?.name || p.user?.email || 'this participant' })}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#000',
                          fontWeight: 'bold',
                          padding: '2px',
                          position: 'absolute',
                          top: '0px',
                          right: '2px',
                          lineHeight: 1
                        }}
                        title="Remove participant"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Share Invite Link, Leave Event, and Delete Event Buttons */}
        <div style={{
          marginTop: isMobile ? '12px' : '20px',
          paddingTop: isMobile ? '12px' : '20px',
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '12px'
        }}>
          <button onClick={handleCopyShareLink} style={{
            padding: isMobile ? '8px 16px' : '10px 20px',
            fontSize: isMobile ? '16px' : '18px',
            background: colors.purple,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            ...getResponsiveButtonWidth(isMobile)
          }}>
            Share Invite Link
          </button>
          {event.created_by !== user?.id && (
            <button
              onClick={() => setShowLeaveEventModal(true)}
              style={{
                ...buttonStyles.secondary,
                padding: isMobile ? '8px 16px' : '10px 20px',
                fontSize: isMobile ? '16px' : '18px',
                ...getResponsiveButtonWidth(isMobile)
              }}
            >
              Leave Event
            </button>
          )}
          {event.created_by === user?.id && (
            <button
              onClick={() => setShowDeleteEventModal(true)}
              style={{
                ...buttonStyles.secondary,
                padding: isMobile ? '8px 16px' : '10px 20px',
                fontSize: isMobile ? '16px' : '18px',
                ...getResponsiveButtonWidth(isMobile)
              }}
            >
              Delete Event
            </button>
          )}
        </div>
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

      {/* All Balances Section */}
      {splits.length > 0 && event.participants && event.participants.length > 1 && showAllBalances && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            background: colors.surface,
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {event.participants
                .sort((a, b) => {
                  // Sort so current user appears first
                  if (a.user_id === user?.id) return -1;
                  if (b.user_id === user?.id) return 1;
                  return 0;
                })
                .map(p => {
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
                          return isCurrentUser ? `People owe you $${balance.toFixed(2)}` : `People owe $${balance.toFixed(2)}`;
                        } else if (balance < -0.01) {
                          return isCurrentUser ? `You owe $${Math.abs(balance).toFixed(2)}` : `Owes $${Math.abs(balance).toFixed(2)}`;
                        }
                        return isCurrentUser ? `You owe $0.00` : `$0.00`;
                      })()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settling Vote Section */}
      {event.participants && event.participants.length > 0 && splits.length > 0 && (
        <div style={{
          background: colors.surface,
          padding: window.innerWidth < 600 ? '12px' : '20px',
          borderRadius: '8px',
          border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
          marginBottom: window.innerWidth < 600 ? '16px' : '24px'
        }}>
          <div style={{ marginBottom: window.innerWidth < 600 ? '10px' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: window.innerWidth < 600 && event.is_settled ? '8px' : '0' }}>
              <h3 style={{ margin: 0, color: colors.text, fontSize: window.innerWidth < 600 ? '18px' : '22px' }}>
                Settle Event
              </h3>
              {event.is_settled && (
                <span style={{
                  padding: '4px 8px',
                  background: colors.purple,
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  ✓
                </span>
              )}
              {!isMobile && (
                <span style={{
                  padding: '8px 16px',
                  background: event.is_settled ? colors.purple : 'transparent',
                  color: event.is_settled ? '#fff' : 'transparent',
                  borderRadius: '20px',
                  fontSize: '18px',
                  fontWeight: '600',
                  visibility: event.is_settled ? 'visible' : 'hidden',
                  marginLeft: 'auto'
                }}>
                  All settled up!
                </span>
              )}
            </div>
            {isMobile && (
              <div style={{
                height: event.is_settled ? 'auto' : '0',
                overflow: 'hidden',
                transition: 'height 0.2s ease'
              }}>
                <span style={{
                  padding: '6px 12px',
                  background: colors.purple,
                  color: '#fff',
                  borderRadius: '20px',
                  fontSize: '16px',
                  fontWeight: '600',
                  display: 'inline-block'
                }}>
                  All settled up!
                </span>
              </div>
            )}
          </div>

          <div style={{ fontSize: window.innerWidth < 600 ? '16px' : '18px', color: colors.text, marginBottom: window.innerWidth < 600 ? '10px' : '16px', opacity: 0.9 }}>
            {event.is_settled
              ? 'Everyone has confirmed this event is settled.'
              : 'Once all participants confirm, this event will be marked as settled.'}
          </div>

          {/* Participant Checkboxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
            {[...event.participants]
              .sort((a, b) => {
                // Sort so current user appears first
                if (a.user_id === user?.id) return -1;
                if (b.user_id === user?.id) return 1;
                return 0;
              })
              .map((participant) => {
              const hasConfirmed = settledConfirmations.some(c => c.user_id === participant.user_id);
              const isCurrentUser = participant.user_id === user?.id;

              return (
                <div
                  key={participant.user_id}
                  onClick={isCurrentUser ? handleToggleSettledConfirmation : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '8px' : '12px',
                    padding: isMobile ? '8px 12px' : '12px 16px',
                    background: hasConfirmed ? colors.purple : colors.background,
                    borderRadius: isMobile ? '6px' : '8px',
                    border: `2px solid ${hasConfirmed ? colors.purple : colors.border}`,
                    cursor: isCurrentUser ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                    ...getResponsiveCardWidth(isMobile)
                  }}
                >
                  <div style={{
                    width: isMobile ? '20px' : '24px',
                    height: isMobile ? '20px' : '24px',
                    borderRadius: '4px',
                    border: `2px solid ${hasConfirmed ? '#fff' : colors.border}`,
                    background: hasConfirmed ? colors.purple : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {hasConfirmed && (
                      <span style={{ color: '#fff', fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: isMobile ? '16px' : '20px',
                    color: hasConfirmed ? '#fff' : colors.text,
                    fontWeight: hasConfirmed ? '600' : '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                  }}>
                    {participant.user?.name || participant.user?.email}
                    {isCurrentUser && ' (you)'}
                  </span>
                  {hasConfirmed && !isMobile && (
                    <span style={{
                      fontSize: '20px',
                      color: '#fff',
                      opacity: 0.9,
                      flexShrink: 0
                    }}>
                      Confirmed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: window.innerWidth < 600 ? '10px' : '16px',
            fontSize: window.innerWidth < 600 ? '16px' : '20px',
            color: colors.text,
            opacity: 0.7,
            textAlign: window.innerWidth < 600 ? 'center' : 'left'
          }}>
            {settledConfirmations.length} of {event.participants.length} participants confirmed
          </div>
        </div>
      )}

      {/* Bills Section */}
      <div id="bills-section">
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>
            Bills
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Link to={`/events/${id}/splits/new`} style={{ textDecoration: 'none' }}>
              <button style={{
                ...buttonStyles.primary,
                padding: isMobile ? '8px 16px' : '10px 20px',
                fontSize: isMobile ? '16px' : '18px',
                ...getResponsiveButtonWidth(isMobile)
              }}>
                Add Bill
              </button>
            </Link>
            {splits.length > 0 && (
              <div onClick={toggleAllBills}>
                <Caret direction={expandedBills.size === splits.length ? 'up' : 'down'} />
              </div>
            )}
          </div>
        </div>

        {/* Sort and Filter */}
        {splits.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: '18px', fontWeight: 'bold' }}>
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '16px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '8px',
                  background: colors.surface,
                  color: colors.text,
                  cursor: 'pointer'
                }}
              >
                <option value="date-newest">Date (Newest)</option>
                <option value="date-oldest">Date (Oldest)</option>
                <option value="amount-high">Amount (High to Low)</option>
                <option value="amount-low">Amount (Low to High)</option>
                <option value="category">Category</option>
                <option value="creator">Bill Creator</option>
              </select>
            </div>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: '18px', fontWeight: 'bold' }}>
                Filter By
              </label>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '16px',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '8px',
                  background: colors.surface,
                  color: colors.text,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Bills</option>
                <option value="my-bills">My Bills</option>
                <option value="i-owe">Bills I Owe On</option>
                <option value="i-paid">Bills I Paid For</option>
                <optgroup label="By Category">
                  <option value="cat-food">Food</option>
                  <option value="cat-transportation">Transport</option>
                  <option value="cat-lodging">Lodging</option>
                  <option value="cat-entertainment">Fun</option>
                  <option value="cat-groceries">Groceries</option>
                  <option value="cat-other">Other</option>
                  <option value="cat-uncategorized">Uncategorized</option>
                </optgroup>
              </select>
            </div>
          </div>
        )}

        {/* Bill Search */}
        {splits.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: '18px', fontWeight: 'bold' }}>
              Search Bills
            </label>
            <div style={{ fontSize: '16px', color: colors.text, opacity: 0.7, marginBottom: '4px' }}>
              Search by description or payer...
            </div>
            <input
              type="text"
              value={billSearchQuery}
              onChange={(e) => setBillSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '16px',
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                background: colors.surface,
                color: colors.text
              }}
            />
          </div>
        )}

        {/* Results count */}
        {filteredBills.length > 0 && (
          <div style={{ marginBottom: '12px', fontSize: '16px', color: colors.text, opacity: 0.7 }}>
            Showing {billsStartIndex + 1}-{Math.min(billsEndIndex, filteredBills.length)} of {filteredBills.length} bills
          </div>
        )}

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
        ) : filteredBills.length === 0 ? (
          <div style={{
            padding: '40px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.text,
            fontSize: '18px'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>No bills found</div>
            {billSearchQuery ? (
              <div>No bills match "{billSearchQuery}"</div>
            ) : (
              <div>Try changing your filter settings</div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {paginatedBills.map((split) => {
              const isExpanded = expandedBills.has(split.split_id);
              const payerName = split.paid_by === user?.id ? 'you' : (split.paid_by_user?.name || split.paid_by_user?.email);

              return (
              <div
                key={split.split_id}
                style={{
                  background: getParticipantColor(split.paid_by),
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Collapsed View */}
                {!isExpanded && (
                  <div
                    onClick={() => toggleBillExpanded(split.split_id)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {split.title}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', opacity: 0.8, flexShrink: 0 }}>
                        ${split.amount.toFixed(2)}
                      </span>
                      <span style={{ fontSize: '14px', color: '#000', opacity: 0.6, flexShrink: 0 }}>
                        by {payerName}
                      </span>
                    </div>
                    <Caret direction="down" />
                  </div>
                )}

                {/* Expanded View */}
                {isExpanded && (
                  <div style={{ padding: '16px' }}>
                    <div
                      onClick={() => toggleBillExpanded(split.split_id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '20px', color: '#000' }}>{split.title}</strong>
                      </div>
                      <Caret direction="up" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      {split.category && (
                        <span style={{
                          padding: '4px 12px',
                          background: colors.skyBlue,
                          color: '#000',
                          borderRadius: '16px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          {getCategoryLabel(split.category)}
                        </span>
                      )}
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
                        style={buttonStyles.small}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          );
        })}
      </div>
        )}

        {/* Pagination Controls */}
        {totalBillsPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '24px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => goToBillsPage(billsPage - 1)}
              disabled={billsPage === 1}
              style={{
                padding: '8px 16px',
                background: billsPage === 1 ? colors.surface : colors.purple,
                color: billsPage === 1 ? colors.text : '#fff',
                border: `2px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: billsPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: billsPage === 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>

            {/* Page numbers */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {Array.from({ length: totalBillsPages }, (_, i) => i + 1).map(page => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 ||
                                 page === totalBillsPages ||
                                 (page >= billsPage - 1 && page <= billsPage + 1);

                // Show ellipsis
                const showEllipsisBefore = page === billsPage - 2 && billsPage > 3;
                const showEllipsisAfter = page === billsPage + 2 && billsPage < totalBillsPages - 2;

                if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                  return null;
                }

                if (showEllipsisBefore || showEllipsisAfter) {
                  return (
                    <span key={page} style={{ padding: '8px 4px', color: colors.text }}>
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={page}
                    onClick={() => goToBillsPage(page)}
                    style={{
                      padding: '8px 12px',
                      background: billsPage === page ? colors.purple : colors.surface,
                      color: billsPage === page ? '#fff' : colors.text,
                      border: `2px solid ${billsPage === page ? colors.purple : colors.border}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: billsPage === page ? 'bold' : 'normal'
                    }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => goToBillsPage(billsPage + 1)}
              disabled={billsPage === totalBillsPages}
              style={{
                padding: '8px 16px',
                background: billsPage === totalBillsPages ? colors.surface : colors.purple,
                color: billsPage === totalBillsPages ? colors.text : '#fff',
                border: `2px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: billsPage === totalBillsPages ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: billsPage === totalBillsPages ? 0.5 : 1
              }}
            >
              Next
            </button>
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
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleDeleteSplit}
                style={buttonStyles.secondary}
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteModal({ show: false, splitId: null })}
                style={buttonStyles.secondary}
              >
                Cancel
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleDeleteEvent}
                style={buttonStyles.secondary}
              >
                Delete Event
              </button>
              <button
                onClick={() => setShowDeleteEventModal(false)}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Event Confirmation Modal */}
      {showLeaveEventModal && (
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
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>Leave Event?</h3>
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              This will remove you from the event and delete all bills you created or paid for. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleLeaveEvent}
                style={buttonStyles.secondary}
              >
                Leave Event
              </button>
              <button
                onClick={() => setShowLeaveEventModal(false)}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Participant Confirmation Modal */}
      {removeParticipantModal.show && (
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
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>Remove Participant?</h3>
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              This will remove {removeParticipantModal.userName} from the event and delete all bills they created or paid for. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleRemoveParticipant}
                style={buttonStyles.secondary}
              >
                Remove Participant
              </button>
              <button
                onClick={() => setRemoveParticipantModal({ show: false, userId: null, userName: null })}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
