import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { typography } from '../styles/typography';
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
      setError('Invalid invite link.');
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
      setError('Failed to get Google login URL.');
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

  if (loading) {
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
        <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', textAlign: 'center' }}>
          <div style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>Loading invite...</div>
        </div>
      </div>
    );
  }

  if (error && !invite) {
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
        <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px' }}>
          <div style={{
            padding: '20px',
            background: colors.error,
            color: colors.text,
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: typography.getFontSize('body', isMobile),
            textAlign: 'center'
          }}>
            {error}
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/dashboard" style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

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
          fontSize: isMobile ? '24px' : '28px',
          fontWeight: 'bold'
        }}>
          LedgerSplit
        </h1>
      </div>

      <div style={{ maxWidth: '500px', margin: '0 auto', padding: isMobile ? '16px 10px' : '20px', width: '100%' }}>
      {/* Invite Info */}
      <div style={{
        background: colors.surface,
        padding: isMobile ? '16px' : '24px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: isMobile ? '16px' : '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: colors.text, marginBottom: isMobile ? '8px' : '12px', fontSize: typography.getFontSize('h2', isMobile) }}>
          You're Invited!
        </h2>
        <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '0', lineHeight: '1.5' }}>
          Your friend wants to split payments using LedgerSplit for the <strong>{invite.name}</strong> event.
        </p>
      </div>

      {error && (
        <div style={{
          padding: isMobile ? '8px' : '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: isMobile ? '12px' : '16px',
          fontSize: typography.getFontSize('body', isMobile)
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
              padding: isMobile ? '16px' : '24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>
              <h3 style={{ color: colors.text, marginBottom: isMobile ? '12px' : '16px', fontSize: typography.getFontSize('h3', isMobile) }}>
                Create Account
              </h3>

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
                    Name
                  </label>
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
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
                    Email
                  </label>
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
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: isMobile ? '10px' : '14px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
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
                      padding: isMobile ? '6px' : '8px',
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
                    ...buttonStyles.primary,
                    padding: isMobile ? '8px' : '10px',
                    fontSize: typography.getFontSize('body', isMobile),
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginBottom: isMobile ? '10px' : '12px'
                  }}
                >
                  {submitting ? 'Creating Account...' : 'Create Account and Join Event'}
                </button>

                <div style={{ textAlign: 'center', marginBottom: isMobile ? '10px' : '12px', marginTop: '4px' }}>
                  <span style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  style={{
                    ...buttonStyles.primary,
                    padding: isMobile ? '8px' : '10px',
                    fontSize: typography.getFontSize('body', isMobile),
                    marginBottom: isMobile ? '10px' : '14px'
                  }}
                >
                  Continue with Google
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    style={{
                      ...buttonStyles.primary,
                      padding: isMobile ? '8px' : '10px',
                      fontSize: typography.getFontSize('body', isMobile)
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
              padding: isMobile ? '16px' : '24px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`
            }}>

              <form onSubmit={handleLogin}>
                <div style={{ marginBottom: isMobile ? '8px' : '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
                    Email
                  </label>
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
                      background: colors.columbiaBlue,
                      color: colors.text
                    }}
                  />
                </div>

                <div style={{ marginBottom: isMobile ? '10px' : '14px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold', color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: isMobile ? '6px' : '8px',
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
                    ...buttonStyles.primary,
                    padding: isMobile ? '8px' : '10px',
                    fontSize: typography.getFontSize('body', isMobile),
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    marginBottom: isMobile ? '8px' : '10px'
                  }}
                >
                  {submitting ? 'Signing In...' : 'Sign in and Join Event'}
                </button>

                <div style={{ textAlign: 'left', marginBottom: isMobile ? '10px' : '12px' }}>
                  <Link to="/forgot-password" style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile), textDecoration: 'underline' }}>
                    Forgot password?
                  </Link>
                </div>

                <div style={{ textAlign: 'center', marginBottom: isMobile ? '10px' : '12px', marginTop: '4px' }}>
                  <span style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  style={{
                    ...buttonStyles.primary,
                    padding: isMobile ? '8px' : '10px',
                    fontSize: typography.getFontSize('body', isMobile),
                    marginBottom: isMobile ? '10px' : '14px'
                  }}
                >
                  Continue with Google
                </button>

                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    style={{
                      ...buttonStyles.primary,
                      padding: isMobile ? '8px' : '10px',
                      fontSize: typography.getFontSize('body', isMobile)
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
    </div>
  );
}
