import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { buttonStyles } from '../styles/buttons';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT } from '../styles/constants';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
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
    setPasswordError('');
    setHasAttemptedSubmit(true);

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
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
          background: colors.surface,
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
          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value.length > 0 && e.target.value.length < 8) {
                  setPasswordError('Password must be at least 8 characters');
                } else if (confirmPassword && e.target.value !== confirmPassword) {
                  setPasswordError('Passwords do not match');
                } else {
                  setPasswordError('');
                }
              }}
              required
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS,
                color: colors.text
              }}
            />
            {hasAttemptedSubmit && passwordError && passwordError !== 'Passwords do not match' && (
              <div style={{
                color: colors.text,
                fontSize: '16px',
                fontWeight: LABEL_FONT_WEIGHT,
                marginTop: '4px'
              }}>
                {passwordError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (password && e.target.value !== password) {
                  setPasswordError('Passwords do not match');
                } else if (password.length > 0 && password.length < 8) {
                  setPasswordError('Password must be at least 8 characters');
                } else {
                  setPasswordError('');
                }
              }}
              required
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: BORDER_RADIUS,
                color: colors.text
              }}
            />
            {hasAttemptedSubmit && passwordError === 'Passwords do not match' && (
              <div style={{
                color: colors.text,
                fontSize: '16px',
                fontWeight: LABEL_FONT_WEIGHT,
                marginTop: '4px'
              }}>
                {passwordError}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyles.primary,
              padding: isMobile ? '8px' : '10px',
              fontSize: isMobile ? '16px' : '18px',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '20px'
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
