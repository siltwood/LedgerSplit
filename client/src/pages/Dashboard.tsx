import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { typography } from '../styles/typography';
import Caret from '../components/Caret';

type SortOption = 'newest' | 'oldest' | 'name';
type FilterOption = 'all' | 'active' | 'settled' | 'dismissed';

const EVENTS_PER_PAGE = 15;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showLeaveEventModal, setShowLeaveEventModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [currentPage, setCurrentPage] = useState(1);

  const handleDismiss = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await eventsAPI.update(eventId, { is_dismissed: true });
      loadData();
    } catch (error) {
      console.error('Failed to dismiss event:', error);
    }
  };

  const handleUndismiss = async (eventId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await eventsAPI.update(eventId, { is_dismissed: false });
      loadData();
    } catch (error) {
      console.error('Failed to undismiss event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!showDeleteModal) return;

    try {
      await eventsAPI.delete(showDeleteModal);
      setShowDeleteModal(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete event:', error);
      alert('Failed to delete event');
    }
  };

  const handleLeaveEvent = async () => {
    if (!showLeaveEventModal) return;

    try {
      await eventsAPI.leaveEvent(showLeaveEventModal);
      setShowLeaveEventModal(null);
      loadData();
    } catch (error) {
      console.error('Failed to leave event:', error);
      alert('Failed to leave event');
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const toggleAllEvents = () => {
    if (expandedEvents.size === filteredEvents.length) {
      // All expanded, collapse all
      setExpandedEvents(new Set());
    } else {
      // Some or none expanded, expand all
      setExpandedEvents(new Set(filteredEvents.map(e => e.event_id)));
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check for pending invite token (from Google OAuth redirect)
    const inviteToken = sessionStorage.getItem('invite_token');
    if (inviteToken) {
      sessionStorage.removeItem('invite_token');
      navigate(`/accept-invite?token=${inviteToken}`);
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const eventsRes = await eventsAPI.getAll();
      const eventsData = eventsRes.data.events || [];
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}></div>;
  }

  // Color palette for participants (same as EventDetail)
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
      // Apply status filter
      if (filterBy === 'active' && (event.is_dismissed || event.is_settled)) return false;
      if (filterBy === 'settled' && !event.is_settled) return false;
      if (filterBy === 'dismissed' && !event.is_dismissed) return false;

      // Apply search query
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase();

      // Check for "me", "you", "my events" keywords to show user's events
      if (query === 'me' || query === 'you' || query === 'my events') {
        return event.created_by === user?.id;
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
      // First sort: dismissed events always go to bottom
      if (a.is_dismissed && !b.is_dismissed) return 1;
      if (!a.is_dismissed && b.is_dismissed) return -1;

      // Then apply regular sort for events with same dismissed status
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Calculate stats
  const activeEvents = events.filter(e => !e.is_dismissed && !e.is_settled).length;
  const settledEvents = events.filter(e => e.is_settled).length;

  // Format number with k suffix for 1000+
  const formatCount = (num: number): string => {
    if (num >= 1000) {
      const thousands = num / 1000;
      return thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1)}k`;
    }
    return num.toString();
  };

  // Get first search suggestion for in-place autocomplete
  const getInlineSuggestion = (): string => {
    if (!searchQuery.trim()) return '';

    const query = searchQuery.toLowerCase();

    // Try to find first matching event name that starts with query
    for (const event of events) {
      if (event.name.toLowerCase().startsWith(query)) {
        return event.name;
      }
    }

    // Try participant names
    for (const event of events) {
      if (event.participants) {
        for (const p of event.participants) {
          const name = p.user?.name;
          if (name && name.toLowerCase().startsWith(query)) {
            return name;
          }
        }
      }
    }

    return '';
  };

  const suggestion = getInlineSuggestion();

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, filterBy]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const endIndex = startIndex + EVENTS_PER_PAGE;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '12px', fontSize: typography.getFontSize('h1', isMobile) }}>Dashboard</h1>

      {/* Quick Actions */}
      <div style={{ marginBottom: '16px' }}>
        <Link to="/events/new" style={{ textDecoration: 'none' }}>
          <button style={{
            ...buttonStyles.primary,
            ...getResponsiveButtonWidth(isMobile)
          }}>
            Add New Event
          </button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'normal', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
          Search Events and Participants
        </label>
        <div style={{ position: 'relative', width: '100%', maxWidth: window.innerWidth < 600 ? '100%' : '600px' }}>
          {/* Ghost text for in-place suggestion */}
          {suggestion && searchQuery && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '12px',
              color: colors.text,
              opacity: 0.4,
              fontSize: typography.getFontSize('body', isMobile),
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden'
            }}>
              <span style={{ visibility: 'hidden' }}>{searchQuery}</span>{suggestion.slice(searchQuery.length)}
            </div>
          )}
          <input
            type="text"
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab' && suggestion) {
                e.preventDefault();
                setSearchQuery(suggestion);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: typography.getFontSize('body', isMobile),
              border: `2px solid ${colors.border}`,
              borderRadius: '8px',
              background: colors.surface,
              color: colors.text,
              outline: 'none',
              marginBottom: '8px',
              position: 'relative',
              zIndex: 1
            }}
          />
        </div>

        {/* Filter and Sort Controls */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '12px', flexWrap: isMobile ? 'wrap' : 'nowrap', width: '100%' }}>
          <div style={{ flex: isMobile ? '1' : 'none', minWidth: isMobile ? '200px' : 'auto', maxWidth: isMobile ? '100%' : '300px', width: isMobile ? 'auto' : '300px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
              Filter
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 12px',
                fontSize: typography.getFontSize('body', isMobile),
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                background: colors.surface,
                color: colors.text,
                cursor: 'pointer'
              }}
            >
              <option value="all">All Events</option>
              <option value="active">Active Only</option>
              <option value="settled">Settled Only</option>
              <option value="dismissed">Dismissed Only</option>
            </select>
          </div>

          <div style={{ flex: isMobile ? '1' : 'none', minWidth: isMobile ? '200px' : 'auto', maxWidth: isMobile ? '100%' : '300px', width: isMobile ? 'auto' : '300px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 12px',
                fontSize: typography.getFontSize('body', isMobile),
                border: `2px solid ${colors.border}`,
                borderRadius: '8px',
                background: colors.surface,
                color: colors.text,
                cursor: 'pointer'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ color: colors.text, margin: 0, fontSize: typography.getFontSize('h2', isMobile) }}>Your Events</h2>
            {paginatedEvents.length > 0 && (
              <div onClick={toggleAllEvents}>
                <Caret direction={expandedEvents.size === paginatedEvents.length ? 'up' : 'down'} />
              </div>
            )}
          </div>

          {/* Event Count Badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {activeEvents > 0 && (
              <span style={{
                padding: '4px 10px',
                background: colors.surface,
                color: colors.text,
                border: `2px solid ${colors.border}`,
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                {formatCount(activeEvents)} active
              </span>
            )}
            {settledEvents > 0 && (
              <span style={{
                padding: '4px 10px',
                background: colors.purple,
                color: '#fff',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                {formatCount(settledEvents)} settled
              </span>
            )}
          </div>
        </div>

        {/* Results count */}
        {filteredEvents.length > 0 && (
          <div style={{ marginBottom: '12px', fontSize: typography.getFontSize('body', isMobile), color: colors.text, opacity: 0.7 }}>
            Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
          </div>
        )}

        {events.length === 0 ? (
          <div style={{
            padding: '60px 40px',
            background: colors.surface,
            border: `2px dashed ${colors.border}`,
            borderRadius: '12px',
            textAlign: 'center',
            color: colors.text
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <div style={{ fontSize: typography.getFontSize('h2', isMobile), fontWeight: 'bold', marginBottom: '12px' }}>No events yet</div>
            <div style={{ fontSize: typography.getFontSize('bodyLarge', isMobile), opacity: 0.7, marginBottom: '24px' }}>
              Create your first event to start tracking shared expenses with friends and family
            </div>
            <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center' }}>
              <Link to="/events/new" style={{ textDecoration: 'none' }}>
                <button style={{
                  ...buttonStyles.primary,
                  ...getResponsiveButtonWidth(isMobile)
                }}>
                  Create Event
                </button>
              </Link>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
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
            <div style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', marginBottom: '8px' }}>No events found</div>
            {searchQuery ? (
              <div>No events match "{searchQuery}"</div>
            ) : (
              <div>Try changing your filter settings</div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {paginatedEvents.map((event) => {
              const isExpanded = expandedEvents.has(event.event_id);

              return (
                <div
                  key={event.event_id}
                  style={{
                    background: event.is_dismissed ? colors.cadetGray2 : colors.surface,
                    border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Collapsed View */}
                  {!isExpanded && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        toggleEventExpanded(event.event_id);
                      }}
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
                        <span style={{ fontSize: typography.getFontSize('h3', isMobile), fontWeight: 'bold', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {event.name}
                        </span>
                        {event.is_settled && (
                          <span style={{
                            padding: '4px 8px',
                            background: colors.purple,
                            color: '#fff',
                            borderRadius: '12px',
                            fontSize: typography.getFontSize('bodySmall', isMobile),
                            fontWeight: '600',
                            flexShrink: 0
                          }}>
                            ✓
                          </span>
                        )}
                        <span style={{ fontSize: '16px', color: colors.text, opacity: 0.6, flexShrink: 0 }}>
                          {new Date(event.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span style={{ fontSize: '16px', color: colors.text, opacity: 0.6, flexShrink: 0 }}>
                          {event.participants?.length || 0} {(event.participants?.length || 0) === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEventExpanded(event.event_id);
                        }}
                      >
                        <Caret direction="down" />
                      </div>
                    </div>
                  )}

                  {/* Expanded View */}
                  {isExpanded && (
                    <div style={{ padding: '16px' }}>
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          toggleEventExpanded(event.event_id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, color: colors.text, fontSize: typography.getFontSize('h3', isMobile) }}>{event.name}</h3>
                          {event.is_settled && (
                            <span style={{
                              padding: '4px 10px',
                              background: colors.purple,
                              color: '#fff',
                              borderRadius: '12px',
                              fontSize: typography.getFontSize('body', isMobile),
                              fontWeight: '600'
                            }}>
                              ✓ Settled
                            </span>
                          )}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEventExpanded(event.event_id);
                          }}
                        >
                          <Caret direction="up" />
                        </div>
                      </div>

                      <div style={{ fontSize: '16px', color: colors.text, opacity: 0.7, marginBottom: '8px' }}>
                        {new Date(event.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>

                      {event.description && (
                        <div style={{ fontSize: '16px', color: colors.text, opacity: 0.8, marginBottom: '12px' }}>
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
                                fontSize: typography.getFontSize('body', isMobile),
                                color: '#000',
                                fontWeight: '500',
                                wordBreak: 'break-word'
                              }}
                            >
                              {p.user?.name || p.user?.email}{p.user_id === user?.id ? ' (you)' : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                        {!event.is_dismissed && (
                          <Link to={`/events/${event.event_id}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                              ...buttonStyles.small,
                              padding: '6px 12px',
                              fontSize: '16px'
                            }}>
                              View Details
                            </button>
                          </Link>
                        )}
                        {!event.is_dismissed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(event.event_id, e);
                            }}
                            style={{
                              ...buttonStyles.small,
                              padding: '6px 12px',
                              fontSize: '16px'
                            }}
                          >
                            Dismiss
                          </button>
                        )}
                        {event.is_dismissed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUndismiss(event.event_id, e);
                            }}
                            style={{
                              ...buttonStyles.small,
                              padding: '6px 12px',
                              fontSize: '16px'
                            }}
                          >
                            Restore
                          </button>
                        )}
                        {event.created_by !== user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowLeaveEventModal(event.event_id);
                            }}
                            style={{
                              ...buttonStyles.small,
                              padding: '6px 12px',
                              fontSize: '16px'
                            }}
                          >
                            Leave Event
                          </button>
                        )}
                        {event.created_by === user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteModal(event.event_id);
                            }}
                            style={{
                              ...buttonStyles.small,
                              padding: '6px 12px',
                              fontSize: '16px'
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
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
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: typography.getFontSize('h3', isMobile) }}>Delete Event?</h3>
            <p style={{ margin: '0 0 16px 0', color: colors.text, fontSize: typography.getFontSize('bodyLarge', isMobile), opacity: 0.9 }}>
              This will permanently delete the event and all associated bills. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleDeleteEvent}
                style={buttonStyles.primary}
              >
                Delete Event
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
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
            padding: '20px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: typography.getFontSize('h3', isMobile) }}>Leave Event?</h3>
            <p style={{ margin: '0 0 16px 0', color: colors.text, fontSize: typography.getFontSize('bodyLarge', isMobile), opacity: 0.9 }}>
              This will remove you from the event and delete all bills you created or paid for. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleLeaveEvent}
                style={buttonStyles.primary}
              >
                Leave Event
              </button>
              <button
                onClick={() => setShowLeaveEventModal(null)}
                style={buttonStyles.secondary}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          marginTop: '24px',
          flexWrap: 'wrap'
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
              fontSize: typography.getFontSize('body', isMobile),
              opacity: currentPage === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>

          {/* Page numbers */}
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 ||
                               page === totalPages ||
                               (page >= currentPage - 1 && page <= currentPage + 1);

              // Show ellipsis
              const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
              const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

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
                  onClick={() => goToPage(page)}
                  style={{
                    padding: '8px 12px',
                    background: currentPage === page ? colors.purple : colors.surface,
                    color: currentPage === page ? '#fff' : colors.text,
                    border: `2px solid ${currentPage === page ? colors.purple : colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: typography.getFontSize('body', isMobile),
                    fontWeight: currentPage === page ? 'bold' : 'normal'
                  }}
                >
                  {page}
                </button>
              );
            })}
          </div>

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
              fontSize: typography.getFontSize('body', isMobile),
              opacity: currentPage === totalPages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}