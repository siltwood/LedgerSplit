import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function CreateEvent() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await eventsAPI.create({
        name,
        description: description || undefined,
      });

      // Navigate to the newly created event page
      const eventId = response.data.event.event_id;
      navigate(`/events/${eventId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '15px' }}>New Event</h1>

      {error && (
        <div style={{
          padding: '8px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '16px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Event Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Weekend Trip, Concert, Dinner Party, etc."
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about the event..."
            rows={3}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text,
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 16px',
              fontSize: '16px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              width: '100%',
              padding: '8px 16px',
              fontSize: '16px',
              background: colors.textSecondary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
