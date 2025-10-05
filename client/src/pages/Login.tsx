import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';

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
      setError('Failed to get Google login URL');
    }
  };

  return (
    <>
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
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{ color: colors.text, marginBottom: '15px', fontSize: '24px' }}>
              Email Already Registered
            </h2>
            <p style={{ color: colors.text, marginBottom: '20px', fontSize: '16px', lineHeight: '1.5' }}>
              This email is already registered with a password. Please log in with your email and password instead.
            </p>
            <button
              onClick={() => setShowModal(false)}
              style={{
                padding: '12px 24px',
                background: colors.primary,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <h1 style={{ color: colors.text, marginBottom: '20px' }}>Login</h1>

        {error && (
        <div style={{
          padding: '10px',
          background: colors.surface,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px', textAlign: 'right' }}>
          <Link to="/forgot-password" style={{ color: colors.text, fontSize: '16px' }}>
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '18px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: colors.text }}>
        <span>or</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '18px',
          background: colors.surface,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Continue with Google
      </button>

        <p style={{ marginTop: '20px', textAlign: 'center', color: colors.text }}>
          Don't have an account? <Link to="/register" style={{ color: colors.text }}>Register</Link>
        </p>
      </div>
    </>
  );
}