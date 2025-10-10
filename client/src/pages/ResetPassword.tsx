import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link.');
    }
  }, [token]);

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
      <h1 style={{ color: colors.text, marginBottom: '15px' }}>Reset Password</h1>

      {success && (
        <div style={{
          padding: '10px',
          background: colors.success,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          Password reset successful! Redirecting to login...
        </div>
      )}

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

      {token ? (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
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
                borderRadius: '4px',
                color: colors.text
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
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
                borderRadius: '4px',
                color: colors.text
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '18px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      ) : (
        <div>
          <p style={{ color: colors.text, fontSize: '16px', marginBottom: '8px' }}>Invalid or missing reset token.</p>
          <Link to="/forgot-password" style={{ color: colors.text, fontSize: '16px' }}>
            Request a new reset link
          </Link>
        </div>
      )}

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: colors.text, fontSize: '16px' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
