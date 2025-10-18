import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { typography } from '../styles/typography';

export default function CreateEvent() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <h1 style={{ color: colors.text, marginBottom: '15px', fontSize: typography.getFontSize('h1', isMobile) }}>New Event</h1>

      {error && (
        <div style={{
          padding: '8px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '18px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
            Event Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              fontSize: typography.getFontSize('bodyLarge', isMobile),
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: typography.getFontSize('bodyLarge', isMobile),
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
              ...buttonStyles.primary,
              ...getResponsiveButtonWidth(isMobile),
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            Create Event
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              ...buttonStyles.secondary,
              ...getResponsiveButtonWidth(isMobile)
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
