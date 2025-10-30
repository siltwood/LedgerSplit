import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { BORDER_RADIUS, LABEL_FONT_WEIGHT, INPUT_PADDING } from '../styles/constants';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [venmoUsername, setVenmoUsername] = useState(user?.venmo_username || '');
  const [savingVenmo, setSavingVenmo] = useState(false);
  const [venmoError, setVenmoError] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSaveVenmo = async () => {
    setSavingVenmo(true);
    setVenmoError('');
    try {
      await authAPI.updateProfile({ venmo_username: venmoUsername });
      await refreshUser();
      setStatus('Venmo username saved successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setVenmoError(err.response?.data?.error || 'Failed to save Venmo username');
    } finally {
      setSavingVenmo(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authAPI.deleteAccount();
      navigate('/login');
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Failed to delete account');
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px', fontSize: typography.getFontSize('h1', isMobile) }}>Settings</h1>

      {/* Profile Section */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text, fontSize: typography.getFontSize('h2', isMobile) }}>Profile</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Name
          </label>
          <div style={{ fontSize: typography.getFontSize('bodyLarge', isMobile), color: colors.text }}>{user?.name}</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', color: colors.text, fontSize: typography.getFontSize('label', isMobile), fontWeight: LABEL_FONT_WEIGHT }}>
            Email
          </label>
          <div style={{ fontSize: typography.getFontSize('bodyLarge', isMobile), color: colors.text }}>{user?.email}</div>
        </div>
        <div style={{ marginBottom: '15px', maxWidth: isMobile ? '100%' : '600px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: LABEL_FONT_WEIGHT, color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
            Venmo Username
          </label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flex: '1', minWidth: '200px', border: `2px solid ${colors.border}`, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                background: colors.surfaceLight,
                fontSize: '16px',
                fontWeight: 'bold',
                color: colors.text
              }}>
                @
              </div>
              <input
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="your-venmo-username"
                style={{
                  flex: '1',
                  padding: '8px 12px',
                  fontSize: '16px',
                  border: 'none',
                  background: colors.surface,
                  color: colors.text,
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={handleSaveVenmo}
              disabled={savingVenmo || !venmoUsername.trim() || venmoUsername === user?.venmo_username}
              style={{
                padding: '8px 16px',
                background: colors.purple,
                color: '#fff',
                border: 'none',
                borderRadius: BORDER_RADIUS,
                cursor: (savingVenmo || !venmoUsername.trim() || venmoUsername === user?.venmo_username) ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                fontWeight: '600',
                width: 'auto',
                opacity: (savingVenmo || !venmoUsername.trim() || venmoUsername === user?.venmo_username) ? 0.5 : 1
              }}
            >
              Save
            </button>
          </div>
          {venmoError ? (
            <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.error, marginTop: '5px', marginBottom: 0 }}>
              {venmoError}
            </p>
          ) : (
            <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.textSecondary, marginTop: '5px', marginBottom: 0 }}>
              Add your Venmo username to let others pay you directly via Venmo
            </p>
          )}
        </div>
        {user?.google_id && (
          <div style={{
            padding: '10px',
            background: colors.surfaceLight,
            borderRadius: BORDER_RADIUS,
            marginTop: '15px',
            maxWidth: isMobile ? '100%' : '600px',
            fontSize: typography.getFontSize('body', isMobile),
            color: colors.text
          }}>
            Connected with Google Account
          </div>
        )}
        {!user?.google_id && (
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={async () => {
                try {
                  await authAPI.requestPasswordChange();
                  setStatus('Password change link sent to your email');
                  setTimeout(() => setStatus(''), 5000);
                } catch (err: any) {
                  setStatus(err.response?.data?.error || 'Failed to send email');
                }
              }}
              style={{
                ...buttonStyles.primary,
                padding: isMobile ? '8px 16px' : '10px 20px',
                fontSize: isMobile ? '16px' : '18px',
                ...getResponsiveButtonWidth(isMobile)
              }}
            >
              Change Password
            </button>
            <p style={{ fontSize: typography.getFontSize('body', isMobile), color: colors.text, marginTop: '5px' }}>
              We'll send you an email with a secure link to change your password.
            </p>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      {status && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          background: colors.success,
          color: colors.text,
          borderRadius: BORDER_RADIUS,
          fontSize: '20px'
        }}>
          {status}
        </div>
      )}
      <div style={{
        background: colors.error,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text, fontSize: typography.getFontSize('h2', isMobile) }}>Danger Zone</h2>
        <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '15px' }}>
          Once you delete your account, there is no going back. Your name will remain visible in
          events and splits you participated in, but you won't be able to log in again.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px',
              background: colors.background,
              color: colors.text,
              border: 'none',
              borderRadius: BORDER_RADIUS,
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
              Are you absolutely sure? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleDeleteAccount}
                style={{
                  padding: '10px 20px',
                  background: colors.background,
                  color: colors.text,
                  border: 'none',
                  borderRadius: BORDER_RADIUS,
                  cursor: 'pointer',
                  fontSize: typography.getFontSize('body', isMobile),
                  fontWeight: 'bold'
                }}
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 20px',
                  background: colors.textSecondary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: BORDER_RADIUS,
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
