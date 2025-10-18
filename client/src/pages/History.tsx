import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import type { Event, EventParticipant } from '../types/index';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import Caret from '../components/Caret';

type ViewType = 'events' | 'bills' | 'payments';
type SortOption = 'newest' | 'oldest' | 'amount';

interface Bill {
  split_id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
  paid_by: string;
  event_id: string;
  event_name?: string;
  payer_name?: string;
  participant_count?: number;
}

const ITEMS_PER_PAGE = 20;

export default function History() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<ViewType>('events');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadData();
  }, [user]);

  // Reset to page 1 when view type, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewType, searchQuery, sortBy]);

  const loadData = async () => {
    if (!user) return;

    try {
      const eventsRes = await eventsAPI.getAll();
      const eventsData = eventsRes.data.events || [];
      setEvents(eventsData);

      // Extract all bills from all events
      const bills: Bill[] = [];
      for (const event of eventsData) {
        if (event.splits) {
          for (const split of event.splits) {
            bills.push({
              split_id: split.split_id,
              description: split.description,
              amount: split.amount,
              category: split.category || 'Other',
              created_at: split.created_at,
              paid_by: split.paid_by,
              event_id: event.event_id,
              event_name: event.name,
              payer_name: event.participants?.find((p: EventParticipant) => p.user_id === split.paid_by)?.user?.name,
              participant_count: split.participants?.length || 0
            });
          }
        }
      }
      setAllBills(bills);
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div style={{ padding: '20px' }}></div>;
  }

  // Color palette for participants
  const participantColors = [
    colors.powderBlue,
    colors.columbiaBlue,
    colors.dustyBlue,
    colors.lightBlue,
    colors.skyBlue,
    colors.steelBlue,
    colors.cadetGray,
    colors.stormGray,
    colors.cadetGray2,
    colors.cadetGray3,
    colors.slateGray,
  ];

  const getParticipantColor = (event: Event, userId: string) => {
    if (!event.participants) return colors.surface;
    const index = event.participants.findIndex(p => p.user_id === userId);
    return index !== -1 ? participantColors[index % participantColors.length] : colors.surface;
  };

  // Filter and sort events
  const filteredEvents = events
    .filter(event => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();

      // Check for "me", "you" keywords
      if (query === 'me' || query === 'you') {
        return event.created_by === user?.id || event.participants?.some(p => p.user_id === user?.id);
      }

      // Check for "settled" keyword
      if (query === 'settled') {
        return event.is_settled;
      }

      // Search event name
      if (event.name.toLowerCase().includes(query)) return true;

      // Search event description
      if (event.description?.toLowerCase().includes(query)) return true;

      // Search participant names/emails
      if (event.participants?.some(p =>
        (p.user?.name?.toLowerCase().includes(query)) ||
        (p.user?.email?.toLowerCase().includes(query))
      )) return true;

      return false;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });

  // Filter and sort bills
  const filteredBills = allBills
    .filter(bill => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();

      // Check for "me", "you" keywords
      if (query === 'me' || query === 'you') {
        return bill.paid_by === user?.id;
      }

      // Search bill description
      if (bill.description.toLowerCase().includes(query)) return true;

      // Search event name
      if (bill.event_name?.toLowerCase().includes(query)) return true;

      // Search category
      if (bill.category.toLowerCase().includes(query)) return true;

      // Search payer name
      if (bill.payer_name?.toLowerCase().includes(query)) return true;

      return false;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      }
      return 0;
    });

  // Get payments (bills paid by or owed to user)
  const userPayments = allBills.filter(bill => bill.paid_by === user?.id);

  // Get current items based on view type
  const getCurrentItems = () => {
    if (viewType === 'events') return filteredEvents;
    if (viewType === 'bills') return filteredBills;
    return userPayments;
  };

  const currentItems = getCurrentItems();
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '12px', fontSize: typography.getFontSize('h1', isMobile) }}>History</h1>

      {/* View Type Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setViewType('events')}
          style={{
            padding: '8px 16px',
            background: viewType === 'events' ? colors.purple : colors.surface,
            color: viewType === 'events' ? '#fff' : colors.text,
            border: `2px solid ${viewType === 'events' ? colors.purple : colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: viewType === 'events' ? 'bold' : 'normal'
          }}
        >
          Events ({filteredEvents.length})
        </button>
        <button
          onClick={() => setViewType('bills')}
          style={{
            padding: '8px 16px',
            background: viewType === 'bills' ? colors.purple : colors.surface,
            color: viewType === 'bills' ? '#fff' : colors.text,
            border: `2px solid ${viewType === 'bills' ? colors.purple : colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: viewType === 'bills' ? 'bold' : 'normal'
          }}
        >
          All Bills ({filteredBills.length})
        </button>
        <button
          onClick={() => setViewType('payments')}
          style={{
            padding: '8px 16px',
            background: viewType === 'payments' ? colors.purple : colors.surface,
            color: viewType === 'payments' ? '#fff' : colors.text,
            border: `2px solid ${viewType === 'payments' ? colors.purple : colors.border}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: viewType === 'payments' ? 'bold' : 'normal'
          }}
        >
          My Payments ({userPayments.length})
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'normal', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
          Search {viewType === 'events' ? 'Events' : viewType === 'bills' ? 'Bills' : 'Payments'}
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '8px 12px',
            fontSize: '16px',
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            background: colors.surface,
            color: colors.text,
            outline: 'none'
          }}
        />
        <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.text, opacity: 0.7, marginTop: '4px' }}>
          Try: "settled", "me", "Food", or any name/description
        </p>
      </div>

      {/* Sort Controls */}
      <div style={{ marginBottom: '16px', maxWidth: '300px' }}>
        <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
          Sort By
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          style={{
            width: '100%',
            padding: '8px 12px',
            fontSize: isMobile ? '16px' : '16px',
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            background: colors.surface,
            color: colors.text,
            cursor: 'pointer'
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          {(viewType === 'bills' || viewType === 'payments') && (
            <option value="amount">Highest Amount</option>
          )}
        </select>
      </div>

      {/* Results count and pagination info */}
      {currentItems.length > 0 && (
        <div style={{ marginBottom: '12px', fontSize: typography.getFontSize('body', isMobile), color: colors.text, opacity: 0.7 }}>
          Showing {startIndex + 1}-{Math.min(endIndex, currentItems.length)} of {currentItems.length} {viewType === 'events' ? 'events' : viewType === 'bills' ? 'bills' : 'payments'}
        </div>
      )}

      {/* Events View */}
      {viewType === 'events' && (
        <div>
          {filteredEvents.length === 0 ? (
            <div style={{
              padding: '40px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              textAlign: 'center',
              color: colors.text
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
              <div style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', marginBottom: '8px' }}>No events found</div>
              {searchQuery ? (
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No events match "{searchQuery}"</div>
              ) : (
                <div>No events in your history</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(paginatedItems as Event[]).map((event) => {
                const isExpanded = expandedItems.has(event.event_id);

                return (
                  <div
                    key={event.event_id}
                    style={{
                      background: colors.surface,
                      border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
                      borderRadius: '8px'
                    }}
                  >
                    <div
                      onClick={() => toggleItemExpanded(event.event_id)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                          {event.name}
                        </span>
                        {event.is_settled && (
                          <span style={{
                            padding: '4px 8px',
                            background: colors.purple,
                            color: '#fff',
                            borderRadius: '12px',
                            fontSize: typography.getFontSize('bodySmall', isMobile),
                            fontWeight: '600'
                          }}>
                            Settled
                          </span>
                        )}
                        <span style={{ fontSize: '16px', color: colors.text, opacity: 0.6 }}>
                          {new Date(event.created_at).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '16px', color: colors.text, opacity: 0.6 }}>
                          {event.participants?.length || 0} people
                        </span>
                        <span style={{ fontSize: '16px', color: colors.text, opacity: 0.6 }}>
                          {event.splits?.length || 0} bills
                        </span>
                      </div>
                      <Caret direction={isExpanded ? 'up' : 'down'} />
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px 16px' }}>
                        {event.description && (
                          <div style={{ fontSize: '16px', color: colors.text, opacity: 0.8, marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.description}
                          </div>
                        )}

                        {event.participants && event.participants.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                            {event.participants.map((p) => (
                              <span
                                key={p.user_id}
                                style={{
                                  padding: '4px 8px',
                                  background: getParticipantColor(event, p.user_id),
                                  borderRadius: '6px',
                                  fontSize: '16px',
                                  color: '#000',
                                  fontWeight: '500',
                                  maxWidth: '200px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        <Link to={`/events/${event.event_id}`} style={{ textDecoration: 'none' }}>
                          <button style={{
                            padding: '6px 12px',
                            background: colors.purple,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}>
                            View Event
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bills View */}
      {(viewType === 'bills' || viewType === 'payments') && (
        <div>
          {(viewType === 'bills' ? filteredBills : userPayments).length === 0 ? (
            <div style={{
              padding: '40px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              textAlign: 'center',
              color: colors.text
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>💰</div>
              <div style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', marginBottom: '8px' }}>
                No {viewType === 'bills' ? 'bills' : 'payments'} found
              </div>
              {searchQuery ? (
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>No {viewType === 'bills' ? 'bills' : 'payments'} match "{searchQuery}"</div>
              ) : (
                <div>No {viewType === 'bills' ? 'bills' : 'payments'} in your history</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(paginatedItems as Bill[]).map((bill) => (
                <div
                  key={bill.split_id}
                  style={{
                    background: colors.surface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    padding: '12px 16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', color: colors.text, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bill.description}
                      </div>
                      <div style={{ fontSize: '16px', color: colors.text, opacity: 0.7 }}>
                        ${bill.amount.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', color: colors.text, opacity: 0.6 }}>
                        {new Date(bill.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 8px',
                      background: colors.dustyBlue,
                      borderRadius: '6px',
                      fontSize: typography.getFontSize('bodySmall', isMobile),
                      color: '#000'
                    }}>
                      {bill.category}
                    </span>
                    <span style={{
                      padding: '4px 8px',
                      background: colors.columbiaBlue,
                      borderRadius: '6px',
                      fontSize: typography.getFontSize('bodySmall', isMobile),
                      color: '#000',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {bill.event_name}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: colors.text, opacity: 0.7, marginBottom: '8px' }}>
                    Paid by {bill.payer_name}{bill.paid_by === user?.id ? ' (you)' : ''} • Split between {bill.participant_count} {bill.participant_count === 1 ? 'person' : 'people'}
                  </div>

                  <Link to={`/events/${bill.event_id}`} style={{ textDecoration: 'none' }}>
                    <button style={{
                      padding: '6px 12px',
                      background: colors.purple,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}>
                      View Event
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          marginTop: '24px'
        }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            style={{
              padding: '8px 16px',
              background: currentPage === 1 ? colors.surface : colors.purple,
              color: currentPage === 1 ? colors.text : '#fff',
              border: `2px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            ←
          </button>

          <span style={{ color: colors.text, fontSize: '18px', fontWeight: '600' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            style={{
              padding: '8px 16px',
              background: currentPage === totalPages ? colors.surface : colors.purple,
              color: currentPage === totalPages ? colors.text : '#fff',
              border: `2px solid ${colors.border}`,
              borderRadius: '4px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
