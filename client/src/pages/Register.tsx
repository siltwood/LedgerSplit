import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { typography } from '../styles/typography';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to get Google signup URL.');
    }
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* LedgerSplit Header */}
      <div style={{
        textAlign: 'center',
        padding: isMobile ? '12px 0 8px' : '16px 0 12px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <h1 style={{
          color: colors.text,
          margin: 0,
          fontSize: typography.getFontSize('h1', isMobile),
          fontWeight: 'bold'
        }}>
          LedgerSplit
        </h1>
      </div>

      <div style={{ flex: 1, maxWidth: '400px', margin: '0 auto', padding: isMobile ? '16px 10px' : '20px 10px', width: '100%' }}>
        <h2 style={{ color: colors.text, marginBottom: '12px', fontSize: typography.getFontSize('h2', isMobile) }}>Register</h2>

        {error && (
          <div style={{
            padding: '8px',
            background: colors.surface,
            color: colors.text,
            borderRadius: '4px',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                color: colors.text
              }}
            />
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                color: colors.text
              }}
            />
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${passwordError ? '#ff6b6b' : colors.border}`,
                borderRadius: '4px',
                color: colors.text
              }}
            />
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: isMobile ? '6px' : '8px',
                fontSize: '16px',
                border: `1px solid ${passwordError ? '#ff6b6b' : colors.border}`,
                borderRadius: '4px',
                color: colors.text
              }}
            />
            {passwordError && (
              <div style={{ color: '#ff6b6b', fontSize: typography.getFontSize('bodySmall', isMobile), marginTop: '4px' }}>
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
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={{ margin: isMobile ? '8px 0' : '12px 0', textAlign: 'center', color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
          <span>or</span>
        </div>

        <button
          onClick={handleGoogleSignup}
          style={{
            ...buttonStyles.primary,
            padding: isMobile ? '8px' : '10px',
            fontSize: isMobile ? '16px' : '18px'
          }}
        >
          Continue with Google
        </button>

        <p style={{ marginTop: isMobile ? '8px' : '12px', textAlign: 'center', color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
          Already have an account? <Link to="/login" style={{ color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: 'bold' }}>Login</Link>
        </p>
      </div>

      <footer style={{
        background: colors.surface,
        padding: isMobile ? '8px' : '10px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile) }}>
          Need help? Contact us at{' '}
          <a href="mailto:hello@ledgersplit.com" style={{ color: colors.text, textDecoration: 'underline' }}>
            hello@ledgersplit.com
          </a>
        </div>
      </footer>
    </div>
  );
}