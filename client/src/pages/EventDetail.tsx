import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { eventsAPI, splitsAPI, paymentsAPI, settledAPI } from '../services/api';
import type { Event, Split, EventSettledConfirmation } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { BORDER_RADIUS, INPUT_PADDING } from '../styles/constants';
import { useAuth } from '../context/AuthContext';
import Caret from '../components/Caret';
import SearchInput from '../components/SearchInput';

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
  const [showAllBalances, setShowAllBalances] = useState(false);
  const [settledConfirmations, setSettledConfirmations] = useState<EventSettledConfirmation[]>([]);
  const [showDeleteEventModal, setShowDeleteEventModal] = useState(false);
  const [showLeaveEventModal, setShowLeaveEventModal] = useState(false);
  const [removeParticipantModal, setRemoveParticipantModal] = useState<{ show: boolean; userId: string | null; userName: string | null }>({ show: false, userId: null, userName: null });
  const [billSearchQuery, setBillSearchQuery] = useState('');
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [sortBy] = useState<string>('payer');
  const [billsPage, setBillsPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [showVenmoMobileWarning, setShowVenmoMobileWarning] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  // Reset to page 1 when search/filter/sort changes
  useEffect(() => {
    setBillsPage(1);
  }, [billSearchQuery, sortBy]);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) return <div style={{ padding: '20px' }}></div>;
  if (!event) {
    // If event is null after loading, redirect to dashboard
    navigate('/dashboard');
    return <div style={{ padding: '20px' }}></div>;
  }

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


  // Filter and sort bills
  const filteredBills = splits
    .filter(split => {
      // Apply search filter
      if (!billSearchQuery.trim()) return true;
      const query = billSearchQuery.toLowerCase();

      // Check for "me", "you", "my bills" keywords to show user's bills
      if (query === 'me' || query === 'you' || query === 'my bills') {
        return split.created_by === user?.id;
      }

      // Check for "[name] paid" pattern - show bills paid by that person
      if (query.includes('paid')) {
        const nameQuery = query.replace(/\s*paid\s*/g, '').trim();
        if (nameQuery === 'i' || nameQuery === 'you') {
          return split.paid_by === user?.id;
        }
        if (nameQuery) {
          return split.paid_by_user?.name?.toLowerCase().includes(nameQuery) ||
                 split.paid_by_user?.email?.toLowerCase().includes(nameQuery);
        }
      }

      // Search by amount (e.g., "30", "30.00", "30.5")
      const numericQuery = parseFloat(query);
      if (!isNaN(numericQuery)) {
        // Match if the amount equals the searched number
        if (split.amount === numericQuery) return true;
        // Also match if the amount string contains the query (e.g., "30" matches "30.00")
        if (split.amount.toString().includes(query)) return true;
      }

      // Search in title
      if (split.title.toLowerCase().includes(query)) return true;

      // Search in payer name (searching someone's name returns bills they paid for)
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
      if (sortBy === 'payer') {
        const payerA = a.paid_by_user?.name || a.paid_by_user?.email || '';
        const payerB = b.paid_by_user?.name || b.paid_by_user?.email || '';
        return payerA.localeCompare(payerB);
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
        padding: isMobile ? '12px' : '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: isMobile ? '16px' : '24px'
      }}>
        <div style={{ marginBottom: isMobile ? '8px' : '16px' }}>
          <h1 style={{ margin: '0 0 4px 0', color: colors.text, fontSize: isMobile ? '22px' : '28px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.name}</h1>
          {event.description && (
            <p style={{ color: colors.text, margin: '0', fontSize: isMobile ? '16px' : '20px', opacity: 0.9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {event.description}
            </p>
          )}
        </div>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <div style={{ marginTop: isMobile ? '8px' : '12px', paddingTop: isMobile ? '8px' : '12px', borderTop: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: isMobile ? '16px' : '20px', color: colors.text, opacity: 0.8, marginBottom: isMobile ? '6px' : '8px' }}>
              {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? '6px' : '8px' }}>
              {event.participants.map((p) => {
                const isCreator = event.created_by === user?.id;
                const isParticipantCreator = p.user_id === event.created_by;
                const canRemove = isCreator && !isParticipantCreator;

                return (
                  <span
                    key={p.user_id}
                    style={{
                      padding: isMobile ? '4px 8px' : '6px 12px',
                      paddingRight: canRemove ? (isMobile ? '24px' : '28px') : (isMobile ? '8px' : '12px'),
                      background: getParticipantColor(p.user_id),
                      borderRadius: '6px',
                      fontSize: isMobile ? '16px' : '20px',
                      color: '#000',
                      fontWeight: '500',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
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
                          fontSize: '16px',
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

        {/* Settle Event and Action Buttons Container */}
        {event.participants && event.participants.length > 0 && splits.length > 0 && (
          <div style={{
            marginTop: isMobile ? '8px' : '12px',
            paddingTop: isMobile ? '8px' : '12px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            gap: isMobile ? '8px' : '16px'
          }}>
            {/* Settle Event Section */}
            <div style={{ flex: isMobile ? 'none' : '1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: colors.text, fontSize: isMobile ? '16px' : '18px' }}>
                  Settle Event
                </h3>
              </div>
              <div style={{ fontSize: isMobile ? '13px' : '14px', color: colors.text, marginBottom: '8px', opacity: 0.8 }}>
                {settledConfirmations.length} of {event.participants.length} confirmed
              </div>
              {/* Current User Checkbox Only */}
              {user && (
                <div
                  onClick={handleToggleSettledConfirmation}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: isMobile ? '6px 10px' : '8px 12px',
                    background: settledConfirmations.some(c => c.user_id === user.id) ? colors.purple : colors.background,
                    borderRadius: '6px',
                    border: `1px solid ${settledConfirmations.some(c => c.user_id === user.id) ? colors.purple : colors.border}`,
                    cursor: 'pointer',
                    fontSize: isMobile ? '14px' : '16px',
                    maxWidth: '100%'
                  }}
                >
                  <div style={{
                    width: isMobile ? '16px' : '18px',
                    height: isMobile ? '16px' : '18px',
                    borderRadius: '3px',
                    border: `2px solid ${settledConfirmations.some(c => c.user_id === user.id) ? '#fff' : colors.border}`,
                    background: settledConfirmations.some(c => c.user_id === user.id) ? colors.purple : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {settledConfirmations.some(c => c.user_id === user.id) && (
                      <span style={{ color: '#fff', fontSize: isMobile ? '13px' : '14px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{
                    color: settledConfirmations.some(c => c.user_id === user.id) ? '#fff' : colors.text,
                    fontWeight: settledConfirmations.some(c => c.user_id === user.id) ? '600' : '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {settledConfirmations.some(c => c.user_id === user.id) ? 'Confirmed settled' : 'Confirm settled'}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons (right side on desktop, below on mobile) */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              gap: isMobile ? '8px' : '10px',
              alignItems: isMobile ? 'stretch' : 'flex-end',
              minWidth: isMobile ? '100%' : '200px'
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
                width: isMobile ? '50%' : '200px',
                flex: isMobile ? '1' : 'none'
              }}>
                Invite to Event
              </button>
              {event.created_by !== user?.id && (
                <button
                  onClick={() => setShowLeaveEventModal(true)}
                  style={{
                    ...buttonStyles.secondary,
                    padding: isMobile ? '8px 16px' : '10px 20px',
                    fontSize: isMobile ? '16px' : '18px',
                    width: isMobile ? '50%' : '200px',
                    flex: isMobile ? '1' : 'none'
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
                    width: isMobile ? '50%' : '200px',
                    flex: isMobile ? '1' : 'none'
                  }}
                >
                  Delete Event
                </button>
              )}
            </div>
          </div>
        )}

        {/* Separator for mobile only (when there are no bills/settle event) */}
        {isMobile && (!event.participants || event.participants.length === 0 || splits.length === 0) && (
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            flexDirection: 'row',
            gap: '8px'
          }}>
            <button onClick={handleCopyShareLink} style={{
              padding: '8px 16px',
              fontSize: '16px',
              background: colors.purple,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              width: '50%',
              flex: '1'
            }}>
              Invite to Event
            </button>
            {event.created_by !== user?.id && (
              <button
                onClick={() => setShowLeaveEventModal(true)}
                style={{
                  ...buttonStyles.secondary,
                  padding: '8px 16px',
                  fontSize: '16px',
                  width: '50%',
                  flex: '1'
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
                  padding: '8px 16px',
                  fontSize: '16px',
                  width: '50%',
                  flex: '1'
                }}
              >
                Delete Event
              </button>
            )}
          </div>
        )}
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

      {/* All Balances Section - Collapsible */}
      {splits.length > 0 && event.participants && event.participants.length > 1 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            background: colors.surface,
            padding: isMobile ? '12px' : '16px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            cursor: 'pointer',
            width: '100%',
            boxSizing: 'border-box'
          }}
            onClick={() => setShowAllBalances(!showAllBalances)}
          >
            {/* Summary View (Always visible) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{
                fontSize: isMobile ? '14px' : '20px',
                fontWeight: 'bold',
                color: '#000'
              }}>
                {(() => {
                  const currentUserBalance = balances[user?.id || ''] || 0;

                  // Calculate settlements to get specific people
                  const calculateSettlements = () => {
                    const creditors = event.participants
                      ?.filter(p => (balances[p.user_id] || 0) > 0.01)
                      .map(p => ({ userId: p.user_id, amount: balances[p.user_id], name: p.user?.name || p.user?.email || 'Unknown' }))
                      .sort((a, b) => b.amount - a.amount) || [];

                    const debtors = event.participants
                      ?.filter(p => (balances[p.user_id] || 0) < -0.01)
                      .map(p => ({ userId: p.user_id, amount: Math.abs(balances[p.user_id]), name: p.user?.name || p.user?.email || 'Unknown' }))
                      .sort((a, b) => b.amount - a.amount) || [];

                    const settlements: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];
                    const creditorsCopy = creditors.map(c => ({ ...c }));
                    const debtorsCopy = debtors.map(d => ({ ...d }));

                    for (const debtor of debtorsCopy) {
                      let remainingDebt = debtor.amount;
                      for (const creditor of creditorsCopy) {
                        if (remainingDebt < 0.01 || creditor.amount < 0.01) continue;
                        const paymentAmount = Math.min(remainingDebt, creditor.amount);
                        settlements.push({
                          from: debtor.userId,
                          fromName: debtor.name,
                          to: creditor.userId,
                          toName: creditor.name,
                          amount: paymentAmount
                        });
                        creditor.amount -= paymentAmount;
                        remainingDebt -= paymentAmount;
                      }
                    }
                    return settlements;
                  };

                  const settlements = calculateSettlements();

                  if (currentUserBalance > 0.01) {
                    const peopleWhoOweYou = settlements.filter(s => s.to === user?.id);
                    if (peopleWhoOweYou.length === 1) {
                      return `${peopleWhoOweYou[0].fromName} owes you $${currentUserBalance.toFixed(2)}`;
                    } else if (peopleWhoOweYou.length > 1) {
                      return `${peopleWhoOweYou.length} people owe you a total of $${currentUserBalance.toFixed(2)}`;
                    }
                    return `People owe you $${currentUserBalance.toFixed(2)}`;
                  } else if (currentUserBalance < -0.01) {
                    const peopleYouOwe = settlements.filter(s => s.from === user?.id);
                    if (peopleYouOwe.length === 1) {
                      return `You owe ${peopleYouOwe[0].toName} $${Math.abs(currentUserBalance).toFixed(2)}`;
                    } else if (peopleYouOwe.length > 1) {
                      return `You owe ${peopleYouOwe.length} people a total of $${Math.abs(currentUserBalance).toFixed(2)}`;
                    }
                    return `You owe $${Math.abs(currentUserBalance).toFixed(2)}`;
                  }
                  return `All settled up`;
                })()}
              </span>
              <Caret direction={showAllBalances ? 'up' : 'down'} />
            </div>

            {/* Detailed View (Expandable) */}
            {showAllBalances && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  // Calculate pairwise settlements (who specifically owes whom)
                  const calculateSettlements = () => {
                    // Get all people with positive balances (creditors) and negative balances (debtors)
                    const creditors = event.participants
                      ?.filter(p => (balances[p.user_id] || 0) > 0.01)
                      .map(p => ({ userId: p.user_id, amount: balances[p.user_id], name: p.user?.name || p.user?.email || 'Unknown' }))
                      .sort((a, b) => b.amount - a.amount) || [];

                    const debtors = event.participants
                      ?.filter(p => (balances[p.user_id] || 0) < -0.01)
                      .map(p => ({ userId: p.user_id, amount: Math.abs(balances[p.user_id]), name: p.user?.name || p.user?.email || 'Unknown' }))
                      .sort((a, b) => b.amount - a.amount) || [];

                    const settlements: { from: string; fromName: string; to: string; toName: string; amount: number }[] = [];

                    // Make copies to work with
                    const creditorsCopy = creditors.map(c => ({ ...c }));
                    const debtorsCopy = debtors.map(d => ({ ...d }));

                    // Greedy algorithm: match largest debtor with largest creditor
                    for (const debtor of debtorsCopy) {
                      let remainingDebt = debtor.amount;

                      for (const creditor of creditorsCopy) {
                        if (remainingDebt < 0.01 || creditor.amount < 0.01) continue;

                        const paymentAmount = Math.min(remainingDebt, creditor.amount);

                        settlements.push({
                          from: debtor.userId,
                          fromName: debtor.name,
                          to: creditor.userId,
                          toName: creditor.name,
                          amount: paymentAmount
                        });

                        creditor.amount -= paymentAmount;
                        remainingDebt -= paymentAmount;
                      }
                    }

                    return settlements;
                  };

                  const settlements = calculateSettlements();

                  // Show all settlements
                  if (settlements.length === 0) {
                    return (
                      <div style={{
                        padding: isMobile ? '8px' : '10px',
                        textAlign: 'center',
                        color: colors.text,
                        opacity: 0.7,
                        fontSize: isMobile ? '15px' : '16px'
                      }}>
                        Everyone is settled up!
                      </div>
                    );
                  }

                  // Sort settlements: current user's settlements first
                  const sortedSettlements = [...settlements].sort((a, b) => {
                    const aInvolvesUser = a.from === user?.id || a.to === user?.id;
                    const bInvolvesUser = b.from === user?.id || b.to === user?.id;

                    if (aInvolvesUser && !bInvolvesUser) return -1;
                    if (!aInvolvesUser && bInvolvesUser) return 1;
                    return 0;
                  });

                  return sortedSettlements.map((settlement, idx) => {
                    const isCurrentUserDebtor = settlement.from === user?.id;
                    const isCurrentUserCreditor = settlement.to === user?.id;
                    const isCurrentUserInvolved = isCurrentUserDebtor || isCurrentUserCreditor;

                    // Get creditor's venmo username
                    const creditor = event.participants?.find(p => p.user_id === settlement.to);
                    const creditorVenmo = creditor?.user?.venmo_username;
                    const canPayViaVenmo = isCurrentUserDebtor && creditorVenmo;

                    const handleVenmoPay = () => {
                      if (!creditorVenmo) return;

                      // Check if actually on mobile device (not just small screen)
                      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                      if (!isMobileDevice) {
                        setShowVenmoMobileWarning(true);
                        return;
                      }

                      const amount = settlement.amount.toFixed(2);
                      const note = encodeURIComponent(`${event.name}`);
                      // Use deep link for mobile - works on mobile devices with Venmo app
                      const venmoUrl = `venmo://paycharge?txn=pay&recipients=${creditorVenmo}&amount=${amount}&note=${note}`;
                      window.location.href = venmoUrl;
                    };

                    // Show button on any screen size, but it will only work on actual mobile devices
                    const showVenmoButton = canPayViaVenmo;

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: isMobile ? '8px' : '10px',
                        background: isCurrentUserInvolved ? colors.background : 'rgba(0, 0, 0, 0.05)',
                        borderRadius: '6px',
                        flexWrap: 'wrap',
                        gap: '8px',
                        border: isCurrentUserInvolved ? `2px solid ${colors.purple}` : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <span style={{ fontSize: isMobile ? '16px' : '18px', color: colors.text, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {isCurrentUserDebtor ? 'You' : settlement.fromName} → {isCurrentUserCreditor ? 'You' : settlement.toName}
                          </span>
                          <span style={{
                            fontSize: isMobile ? '15px' : '16px',
                            fontWeight: '600',
                            color: isCurrentUserInvolved ? colors.purple : colors.text
                          }}>
                            ${settlement.amount.toFixed(2)}
                          </span>
                        </div>
                        {showVenmoButton && (
                          <button
                            onClick={handleVenmoPay}
                            style={{
                              padding: '4px 8px',
                              background: '#008CFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <img
                              src="/venmo.png"
                              alt="Pay with Venmo"
                              style={{
                                height: '20px',
                                width: 'auto'
                              }}
                            />
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bills Section */}
      <div id="bills-section">
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {splits.length > 0 && (
                <div onClick={toggleAllBills} style={{ cursor: 'pointer' }}>
                  <Caret direction={expandedBills.size === splits.length ? 'up' : 'down'} />
                </div>
              )}
              <h2 style={{ margin: 0, color: colors.text, fontSize: '20px' }}>
                Bills
              </h2>
              {!isMobile && (
                <Link to={`/events/${id}/splits/new`} style={{ textDecoration: 'none' }}>
                  <button style={{
                    ...buttonStyles.primary,
                    width: 'auto',
                    padding: '10px 20px',
                    fontSize: '18px'
                  }}>
                    + New Bill
                  </button>
                </Link>
              )}
            </div>
            {isMobile && (
              <Link to={`/events/${id}/splits/new`} style={{ textDecoration: 'none' }}>
                <button style={{
                  ...buttonStyles.primary,
                  width: 'auto',
                  padding: '8px 16px',
                  fontSize: '16px'
                }}>
                  + New Bill
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Bill Search */}
        {splits.length > 0 && (
          <SearchInput
            value={billSearchQuery}
            onChange={setBillSearchQuery}
            isMobile={isMobile}
          />
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
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No bills match "{billSearchQuery}"</div>
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
                    <span style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: '#000',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: '1',
                      minWidth: 0
                    }}>
                      {split.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '14px',
                        color: '#000',
                        opacity: 0.6,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: isMobile ? '100px' : 'none'
                      }}>
                        {payerName}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000', opacity: 0.8 }}>
                        ${split.amount.toFixed(2)}
                      </span>
                      <Caret direction="down" />
                    </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: '20px', color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{split.title}</strong>
                      </div>
                      <Caret direction="up" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                                fontSize: '16px',
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
                      <div style={{ fontSize: '20px', color: '#000', marginTop: '8px', padding: INPUT_PADDING, background: 'rgba(255, 255, 255, 0.3)', borderRadius: BORDER_RADIUS, fontStyle: 'italic' }}>
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
            gap: '12px',
            marginTop: '24px'
          }}>
            <button
              onClick={() => goToBillsPage(billsPage - 1)}
              disabled={billsPage === 1}
              style={{
                padding: '8px 16px',
                background: billsPage === 1 ? colors.surface : colors.purple,
                color: billsPage === 1 ? colors.text : '#fff',
                border: `2px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS,
                cursor: billsPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                opacity: billsPage === 1 ? 0.5 : 1
              }}
            >
              ←
            </button>

            <span style={{ color: colors.text, fontSize: '18px', fontWeight: '600' }}>
              Page {billsPage} of {totalBillsPages}
            </span>

            <button
              onClick={() => goToBillsPage(billsPage + 1)}
              disabled={billsPage === totalBillsPages}
              style={{
                padding: '8px 16px',
                background: billsPage === totalBillsPages ? colors.surface : colors.purple,
                color: billsPage === totalBillsPages ? colors.text : '#fff',
                border: `2px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS,
                cursor: billsPage === totalBillsPages ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                opacity: billsPage === totalBillsPages ? 0.5 : 1
              }}
            >
              →
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

      {/* Venmo Mobile Warning Modal */}
      {showVenmoMobileWarning && (
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
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '20px' }}>Mobile Device Required</h3>
            <p style={{ margin: '0 0 24px 0', color: colors.text, fontSize: '20px', opacity: 0.9 }}>
              Venmo button only works on mobile devices.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setShowVenmoMobileWarning(false)}
                style={buttonStyles.secondary}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
