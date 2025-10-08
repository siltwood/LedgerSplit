import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../services/api';
import type { Event } from '../types/index';
import { colors } from '../styles/colors';

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    try {
      const eventsRes = await eventsAPI.getAll();
      setEvents(eventsRes.data.events || []);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}></div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Events</h1>

      <div style={{ marginBottom: '30px' }}>
        <Link to="/events/new">
          <button style={{
            padding: '12px 24px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            + New Event
          </button>
        </Link>
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {events.map((event) => (
            <Link
              key={event.event_id}
              to={`/events/${event.event_id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  padding: '20px',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <h3 style={{ margin: '0 0 8px 0', color: colors.text }}>{event.name}</h3>
                {event.description && (
                  <div style={{ fontSize: '20px', color: colors.text, marginBottom: '10px' }}>
                    {event.description}
                  </div>
                )}
                {event.participants && (
                  <div style={{ fontSize: '20px', color: colors.text }}>
                    {event.participants.length} participant{event.participants.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
