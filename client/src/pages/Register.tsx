import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, INPUT_PADDING, LABEL_FONT_WEIGHT } from '../styles/constants';
import Footer from '../components/Footer';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'oauth_expired') {
      setError('Login session expired. Please try again.');
      // Clear the error from URL
      window.history.replaceState({}, '', '/register');
    }
  }, [searchParams]);

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
        padding: isMobile ? '12px 0 8px' : '16px 0 12px'
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
        {error && (
          <div style={{
            padding: INPUT_PADDING,
            background: colors.surface,
            color: colors.text,
            borderRadius: BORDER_RADIUS,
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.length > 20) {
                  setNameError('Max name length is 20');
                } else {
                  setNameError('');
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
            {nameError && (
              <div style={{
                color: colors.text,
                fontSize: '16px',
                fontWeight: LABEL_FONT_WEIGHT,
                marginTop: '4px'
              }}>
                {nameError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (e.target.value && !emailRegex.test(e.target.value)) {
                  setEmailError('Please enter a valid email address');
                } else {
                  setEmailError('');
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
            {emailError && (
              <div style={{
                color: colors.text,
                fontSize: '16px',
                fontWeight: LABEL_FONT_WEIGHT,
                marginTop: '4px'
              }}>
                {emailError}
              </div>
            )}
          </div>

          <div style={{ marginBottom: isMobile ? '8px' : '10px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>Password</label>
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
            {passwordError && (
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
            <label style={{ display: 'block', marginBottom: '4px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>Confirm Password</label>
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
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div style={{ margin: isMobile ? '8px 0' : '12px 0', textAlign: 'center', color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
          <span style={{ fontWeight: LABEL_FONT_WEIGHT }}>or</span>
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
          Already have an account? <Link to="/login" style={{ color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT, textDecoration: 'underline' }}>Login</Link>
        </p>
      </div>

      <Footer isMobile={isMobile} />
    </div>
  );
}