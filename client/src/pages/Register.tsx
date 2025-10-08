import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';

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
      setPasswordError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
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
      setError('Failed to get Google signup URL');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Register</h1>

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
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: '20px' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '20px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: '20px' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '20px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: '20px' }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '20px',
              border: `1px solid ${passwordError ? '#ff6b6b' : colors.border}`,
              borderRadius: '4px',
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: '20px' }}>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '20px',
              border: `1px solid ${passwordError ? '#ff6b6b' : colors.border}`,
              borderRadius: '4px',
              color: colors.text
            }}
          />
          {passwordError && (
            <div style={{ color: '#ff6b6b', fontSize: '20px', marginTop: '5px' }}>
              {passwordError}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '22px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', color: colors.text }}>
        <span>or</span>
      </div>

      <button
        onClick={handleGoogleSignup}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '22px',
          background: colors.surface,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Continue with Google
      </button>

      <p style={{ marginTop: '20px', textAlign: 'center', color: colors.text, fontSize: '20px' }}>
        Already have an account? <Link to="/login" style={{ color: colors.text }}>Login</Link>
      </p>
    </div>
  );
}