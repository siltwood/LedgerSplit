import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, INPUT_PADDING } from '../styles/constants';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link.');
    }
  }, [token]);

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

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!token) {
      setError('Invalid reset link.');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '30px auto', padding: '15px' }}>
      <h1 style={{ color: colors.text, marginBottom: '15px', fontSize: typography.getFontSize('h1', isMobile) }}>Reset Password</h1>

      {success && (
        <div style={{
          padding: '10px',
          background: colors.success,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '12px',
          fontSize: typography.getFontSize('body', isMobile),
          textAlign: 'center'
        }}>
          Password reset successful! Redirecting to login...
        </div>
      )}

      {error && (
        <div style={{
          padding: INPUT_PADDING,
          background: colors.error,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          marginBottom: '12px',
          fontSize: typography.getFontSize('body', isMobile)
        }}>
          {error}
        </div>
      )}

      {token ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
              width: '100%',
              padding: INPUT_PADDING,
              fontSize: typography.getFontSize('body', isMobile),
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: BORDER_RADIUS,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      ) : (
        <div>
          <p style={{ color: colors.text, fontSize: '18px', marginBottom: '8px' }}>Invalid or missing reset token.</p>
          <Link to="/forgot-password" style={{ color: colors.text, fontSize: '18px' }}>
            Request a new reset link
          </Link>
        </div>
      )}

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: colors.text, fontSize: '18px' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
