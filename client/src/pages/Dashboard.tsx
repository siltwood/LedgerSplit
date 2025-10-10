import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';

type SortOption = 'newest' | 'oldest' | 'name';
type FilterOption = 'all' | 'active' | 'settled' | 'dismissed';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

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
      // Apply sort
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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Dashboard</h1>

      {/* Quick Actions */}
      <div style={{ marginBottom: '30px' }}>
        <Link to="/events/new">
          <button style={{
            padding: '10px 20px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            width: '100%',
            maxWidth: '300px'
          }}>
            Add New Event
          </button>
        </Link>
      </div>

      {/* Search and Filter */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: colors.text, fontSize: '20px' }}>
          Search Events and Participants
        </label>
        <input
          type="text"
          placeholder=""
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '600px',
            padding: '10px 12px',
            fontSize: '18px',
            border: `2px solid ${colors.border}`,
            borderRadius: '8px',
            background: colors.surface,
            color: colors.text,
            outline: 'none',
            marginBottom: '12px'
          }}
        />

        {/* Filter and Sort Controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: '18px' }}>
              Filter
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              style={{
                padding: '8px 12px',
                fontSize: '18px',
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

          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: '18px' }}>
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                padding: '8px 12px',
                fontSize: '18px',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ color: colors.text, margin: 0 }}>Your Events</h2>

          {/* Event Count Badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px',
              background: colors.primary,
              color: '#000',
              borderRadius: '16px',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              {filteredEvents.length} shown
            </span>
            {activeEvents > 0 && (
              <span style={{
                padding: '4px 12px',
                background: colors.surface,
                color: colors.text,
                border: `2px solid ${colors.border}`,
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                {activeEvents} active
              </span>
            )}
            {settledEvents > 0 && (
              <span style={{
                padding: '4px 12px',
                background: colors.purple,
                color: '#fff',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '500'
              }}>
                {settledEvents} settled
              </span>
            )}
          </div>
        </div>

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
            <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>No events yet</div>
            <div style={{ fontSize: '18px', opacity: 0.7, marginBottom: '24px' }}>
              Create your first event to start tracking shared expenses with friends and family
            </div>
            <Link to="/events/new">
              <button style={{
                padding: '12px 24px',
                background: colors.primary,
                color: colors.text,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                Create Your First Event
              </button>
            </Link>
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
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>No events found</div>
            {searchQuery ? (
              <div>No events match "{searchQuery}"</div>
            ) : (
              <div>Try changing your filter settings</div>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 500px), 1fr))',
            gap: '16px'
          }}>
            {filteredEvents.map((event) => (
              <Link
                key={event.event_id}
                to={`/events/${event.event_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                  }}
                  style={{
                    padding: '20px',
                    background: event.is_dismissed ? colors.cadetGray2 : colors.surface,
                    border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    opacity: event.is_dismissed ? 0.6 : 1,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, color: colors.text, fontSize: '24px' }}>{event.name}</h3>
                    {event.is_settled && (
                      <span style={{
                        padding: '6px 12px',
                        background: colors.purple,
                        color: '#fff',
                        borderRadius: '16px',
                        fontSize: '18px',
                        fontWeight: '600'
                      }}>
                        ✓ Settled
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '18px', color: colors.text, opacity: 0.7 }}>
                    {new Date(event.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>

                  {event.description && (
                    <div style={{ fontSize: '18px', color: colors.text, opacity: 0.8 }}>
                      {event.description}
                    </div>
                  )}

                  {event.participants && event.participants.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {event.participants.map((p) => (
                        <span
                          key={p.user_id}
                          style={{
                            padding: '4px 10px',
                            background: getParticipantColor(event, p.user_id),
                            borderRadius: '6px',
                            fontSize: '18px',
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

                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={(e) => event.is_dismissed ? handleUndismiss(event.event_id, e) : handleDismiss(event.event_id, e)}
                      style={{
                        padding: '6px 12px',
                        background: event.is_dismissed ? colors.primary : colors.cadetGray2,
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '18px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      {event.is_dismissed ? 'Restore' : 'Dismiss'}
                    </button>
                    {event.created_by === user?.id && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowDeleteModal(event.event_id);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: colors.error,
                          color: '#000',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '18px',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
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
            <h3 style={{ margin: '0 0 12px 0', color: colors.text, fontSize: '18px' }}>Delete Event?</h3>
            <p style={{ margin: '0 0 16px 0', color: colors.text, fontSize: '18px', opacity: 0.9 }}>
              This will permanently delete the event and all associated bills. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleDeleteEvent}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: colors.error,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '600'
                }}
              >
                Delete Event
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: colors.secondary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
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