import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'email_exists') {
      setShowModal(true);
      // Clear the error from URL
      window.history.replaceState({}, '', '/login');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to get Google login URL.');
    }
  };

  const isMobile = window.innerWidth < 600;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Modal for email already exists */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.background,
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ color: colors.text, marginBottom: '12px', fontSize: '20px' }}>
              Email Already Registered
            </h2>
            <p style={{ color: colors.text, marginBottom: '15px', fontSize: '18px', lineHeight: '1.5' }}>
              This email is already registered with a password. Please log in with your email and password instead.
            </p>
            <button
              onClick={() => setShowModal(false)}
              style={{
                ...buttonStyles.small,
                padding: '8px 16px',
                fontSize: '18px'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* LedgerSplit Header */}
      <div style={{
        textAlign: 'center',
        padding: isMobile ? '12px 0 8px' : '16px 0 12px',
        borderBottom: `1px solid ${colors.border}`
      }}>
        <h1 style={{
          color: colors.text,
          margin: 0,
          fontSize: isMobile ? '24px' : '28px',
          fontWeight: 'bold'
        }}>
          LedgerSplit
        </h1>
      </div>

      <div style={{ flex: 1, maxWidth: '400px', margin: '0 auto', padding: isMobile ? '16px 10px' : '20px 10px', width: '100%' }}>
        <h2 style={{ color: colors.text, marginBottom: '12px', fontSize: isMobile ? '20px' : '24px' }}>Login</h2>

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
          <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: isMobile ? '18px' : '20px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: isMobile ? '6px' : '8px',
              fontSize: isMobile ? '16px' : '18px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: isMobile ? '6px' : '8px' }}>
          <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: isMobile ? '18px' : '20px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: isMobile ? '6px' : '8px',
              fontSize: isMobile ? '16px' : '18px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: isMobile ? '8px' : '12px', textAlign: 'left' }}>
          <Link to="/forgot-password" style={{ color: colors.text, fontSize: isMobile ? '16px' : '18px' }}>
            Forgot password?
          </Link>
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
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ margin: isMobile ? '8px 0' : '12px 0', textAlign: 'center', color: colors.text, fontSize: isMobile ? '16px' : '18px' }}>
        <span>or</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: isMobile ? '8px' : '10px',
          fontSize: isMobile ? '16px' : '18px',
          background: colors.surface,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Continue with Google
      </button>

        <p style={{ marginTop: isMobile ? '8px' : '12px', textAlign: 'center', color: colors.text, fontSize: isMobile ? '16px' : '18px' }}>
          Don't have an account? <Link to="/register" style={{ color: colors.text, fontSize: isMobile ? '18px' : '20px', fontWeight: 'bold' }}>Register</Link>
        </p>
      </div>

      <footer style={{
        background: colors.surface,
        padding: isMobile ? '8px' : '10px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{ color: colors.text, fontSize: isMobile ? '14px' : '16px' }}>
          Need help? Contact us at{' '}
          <a href="mailto:hello@ledgersplit.com" style={{ color: colors.text, textDecoration: 'underline' }}>
            hello@ledgersplit.com
          </a>
        </div>
      </footer>
    </div>
  );
}