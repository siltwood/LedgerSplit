import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Dashboard</h1>

      {/* Quick Actions */}
      <div style={{ marginBottom: '30px' }}>
        <Link to="/events/new">
          <button style={{
            padding: '12px 24px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 'bold'
          }}>
            Add New Event
          </button>
        </Link>
      </div>

      {/* Events */}
      <div>
        <h2 style={{ color: colors.text, marginBottom: '20px' }}>Your Events</h2>
        {events.length === 0 ? (
          <div style={{
            padding: '40px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.text,
            fontSize: '20px'
          }}>
            No events yet. Create one to get started!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events
              .sort((a, b) => {
                // Sort: active events first, then dismissed events
                if (a.is_dismissed && !b.is_dismissed) return 1;
                if (!a.is_dismissed && b.is_dismissed) return -1;
                // Within each group, sort by creation date (newest first)
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              })
              .map((event) => (
              <Link
                key={event.event_id}
                to={`/events/${event.event_id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  style={{
                    padding: '24px',
                    background: event.is_dismissed ? colors.cadetGray2 : colors.surface,
                    border: `2px solid ${event.is_settled ? colors.purple : colors.border}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '16px',
                    opacity: event.is_dismissed ? 0.6 : 1,
                    position: 'relative',
                  }}
                >
                  {event.created_by === user?.id && (
                    <button
                      onClick={(e) => event.is_dismissed ? handleUndismiss(event.event_id, e) : handleDismiss(event.event_id, e)}
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        padding: '8px 16px',
                        background: event.is_dismissed ? colors.primary : colors.cadetGray2,
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {event.is_dismissed ? 'Restore' : 'Dismiss'}
                    </button>
                  )}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, color: colors.text, fontSize: '24px' }}>{event.name}</h3>
                      {event.is_settled && (
                        <span style={{
                          padding: '6px 12px',
                          background: colors.purple,
                          color: '#fff',
                          borderRadius: '16px',
                          fontSize: '16px',
                          fontWeight: '600'
                        }}>
                          ✓ Settled
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '16px', color: colors.text, opacity: 0.7, marginBottom: '8px' }}>
                      {new Date(event.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    {event.description && (
                      <div style={{ fontSize: '22px', color: colors.text, marginBottom: '8px', opacity: 0.8 }}>
                        {event.description}
                      </div>
                    )}
                    {event.participants && (
                      <div style={{ fontSize: '16px', color: colors.text, opacity: 0.7 }}>
                        {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}