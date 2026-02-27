import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT, INPUT_HINT_STYLE } from '../styles/constants';

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
      setError(err.response?.data?.error || 'Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '15px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '15px', fontSize: typography.getFontSize('h1', isMobile) }}>New Event</h1>

      {error && (
        <div style={{
          padding: INPUT_PADDING,
          background: colors.error,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '12px',
          fontSize: '18px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Event Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={40}
            style={{
              width: '100%',
              padding: INPUT_PADDING,
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: BORDER_RADIUS,
              background: colors.surface,
              color: colors.text
            }}
          />
          <div style={INPUT_HINT_STYLE}>Max 40 characters</div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: INPUT_PADDING,
              fontSize: typography.getFontSize('bodyLarge', isMobile),
              border: `1px solid ${colors.border}`,
              borderRadius: BORDER_RADIUS,
              background: colors.surface,
              color: colors.text,
              resize: 'vertical'
            }}
          />
        </div>

        {/* Info message about auto-splitting */}
        <div style={{
          marginBottom: '12px',
          padding: INPUT_PADDING,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: BORDER_RADIUS,
          fontSize: isMobile ? '14px' : '16px',
          color: colors.text,
          opacity: 0.9,
          lineHeight: '1.4'
        }}>
          <strong style={{ fontWeight: LABEL_FONT_WEIGHT }}>Note:</strong> When you invite people to your event, they'll be automatically included in any bills you've already added. This makes it easy to split expenses retroactively.
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
