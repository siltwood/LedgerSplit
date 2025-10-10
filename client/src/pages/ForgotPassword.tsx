import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
      <h1 style={{ color: colors.text, marginBottom: '15px' }}>Forgot Password</h1>
      <p style={{ color: colors.text, fontSize: '16px', marginBottom: '12px' }}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

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

      {message && (
        <div style={{
          padding: '8px',
          background: colors.success,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '12px',
          fontSize: '16px'
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: '20px' }}>
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
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Link to="/login" style={{ color: colors.text, fontSize: '16px' }}>
          Back to Login
        </Link>
      </div>
    </div>
  );
}
