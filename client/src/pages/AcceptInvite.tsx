import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import axios from 'axios';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    loadInvite();
  }, [token]);

  useEffect(() => {
    // If user is already logged in, try to accept the invite
    if (user && invite) {
      handleAcceptInvite();
    }
  }, [user, invite]);

  const loadInvite = async () => {
    try {
      const baseURL = import.meta.env.PROD ? 'https://api.ledgersplit.com/api' : '/api';
      const response = await axios.get(`${baseURL}/events/join/${token}`);
      setInvite(response.data.event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token) return;

    try {
      const baseURL = import.meta.env.PROD ? 'https://api.ledgersplit.com/api' : '/api';
      await axios.post(`${baseURL}/events/join/${token}`, {}, { withCredentials: true });
      // Navigate to the event page
      if (invite?.event_id) {
        navigate(`/events/${invite.event_id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to accept invite');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const baseURL = import.meta.env.PROD ? 'https://api.ledgersplit.com/api' : '/api';
      await axios.post(`${baseURL}/auth/register`, {
        email,
        password,
        name,
      }, { withCredentials: true });

      // Login automatically
      await login(email, password);

      // Accept invite will happen automatically via useEffect
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      // Accept invite will happen automatically via useEffect
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await authAPI.getGoogleAuthUrl();
      // Store token in session storage so we can accept invite after OAuth
      sessionStorage.setItem('invite_token', token || '');
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to get Google login URL');
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
        <div style={{ color: colors.text, fontSize: '16px' }}>Loading invite...</div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
        <div style={{
          padding: '20px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link to="/dashboard" style={{ color: colors.text, fontSize: '16px' }}>
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
      {/* Invite Info */}
      <div style={{
        background: colors.surface,
        padding: '30px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h1 style={{ color: colors.text, marginBottom: '16px', fontSize: '28px' }}>
          You're Invited!
        </h1>
        <p style={{ color: colors.text, fontSize: '16px', marginBottom: '20px', lineHeight: '1.5' }}>
          Your friend wants to split payments using LedgerSplit for the <strong>{invite.name}</strong> event.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {error}
        </div>
      )}

      {/* Register/Login Forms */}
      {!user && (
        <>
          {showRegister ? (
            // Register Form
            <div style={{
              background: colors.surface,
              padding: '30px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>
              <h2 style={{ color: colors.text, marginBottom: '20px', fontSize: '22px' }}>
                Create Account
              </h2>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    background: colors.columbiaBlue,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginBottom: '15px'
                  }}
                >
                  {submitting ? 'Creating Account...' : 'Create Account & Join'}
                </button>

                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <span style={{ color: colors.text, fontSize: '16px' }}>or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    background: colors.columbiaBlue,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                >
                  Continue with Google
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      fontSize: '16px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Already have an account? Sign in
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // Login Form
            <div style={{
              background: colors.surface,
              padding: '30px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '16px',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '4px',
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    background: colors.columbiaBlue,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginBottom: '15px'
                  }}
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </button>

                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                  <Link to="/forgot-password" style={{ color: colors.text, fontSize: '14px', textDecoration: 'underline' }}>
                    Forgot password?
                  </Link>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <span style={{ color: colors.text, fontSize: '16px' }}>or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    background: colors.columbiaBlue,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                >
                  Continue with Google
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.text,
                      fontSize: '16px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Don't have an account? Create one
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
