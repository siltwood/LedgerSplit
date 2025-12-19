import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { buttonStyles } from '../styles/buttons';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT } from '../styles/constants';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
    setMessage('');
    setLoading(true);

    try {
      const response = await authAPI.requestPasswordReset(email);
      setMessage(response.data.message);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '30px auto', padding: '15px' }}>
      <h1 style={{ color: colors.text, marginBottom: '15px', fontSize: typography.getFontSize('h1', isMobile) }}>Forgot Password</h1>
      <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '12px' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && (
        <div style={{
          padding: INPUT_PADDING,
          background: colors.surface,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '12px',
          fontSize: typography.getFontSize('body', isMobile)
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          padding: INPUT_PADDING,
          background: colors.success,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '12px',
          fontSize: typography.getFontSize('body', isMobile)
        }}>
          <div>{message}</div>
          <div style={{ marginTop: '8px' }}>
            Check your spam folder if you don't see it.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: BORDER_RADIUS,
              color: colors.text
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...buttonStyles.primary,
            width: '100%',
            padding: isMobile ? '8px 16px' : '10px 20px',
            fontSize: isMobile ? '16px' : '18px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
