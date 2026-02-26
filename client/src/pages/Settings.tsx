import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { buttonStyles, getResponsiveButtonWidth } from '../styles/buttons';
import { BORDER_RADIUS, LABEL_FONT_WEIGHT } from '../styles/constants';

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [venmoUsername, setVenmoUsername] = useState(user?.venmo_username || '');
  const [savingVenmo, setSavingVenmo] = useState(false);
  const [venmoError, setVenmoError] = useState('');
  const [venmoSaved, setVenmoSaved] = useState(false);
  const [passwordEmailSent, setPasswordEmailSent] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [cookieConsent, setCookieConsent] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Load cookie consent preference
    const consent = localStorage.getItem('cookie-consent');
    setCookieConsent(consent);
  }, []);

  const handleSaveVenmo = async () => {
    setSavingVenmo(true);
    setVenmoError('');
    setVenmoSaved(false);
    try {
      await authAPI.updateProfile({ venmo_username: venmoUsername });
      await refreshUser();
      setVenmoSaved(true);
      setTimeout(() => setVenmoSaved(false), 2000);
    } catch (err: any) {
      setVenmoError(err.response?.data?.error || 'Failed to save Venmo username');
    } finally {
      setSavingVenmo(false);
    }
  };

  const handleDeleteVenmo = async () => {
    setSavingVenmo(true);
    setVenmoError('');
    try {
      await authAPI.updateProfile({ venmo_username: '' });
      setVenmoUsername('');
      await refreshUser();
    } catch (err: any) {
      setVenmoError(err.response?.data?.error || 'Failed to delete Venmo username');
    } finally {
      setSavingVenmo(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authAPI.deleteAccount();
      navigate('/login');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete account');
      setShowDeleteConfirm(false);
    }
  };

  const handleUpdateCookieConsent = (accepted: boolean) => {
    const consentValue = accepted ? 'accepted' : 'declined';
    localStorage.setItem('cookie-consent', consentValue);
    setCookieConsent(consentValue);
    // Dispatch event to notify GoogleAnalytics component
    window.dispatchEvent(new CustomEvent(accepted ? 'cookie-consent-accepted' : 'cookie-consent-declined'));
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const response = await authAPI.exportData();

      // Create blob and download
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledgersplit-data-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to export data');
    } finally {
      setExportingData(false);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <label style={{ fontWeight: LABEL_FONT_WEIGHT, color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
              Venmo Username
            </label>
            {venmoSaved && (
              <div style={{
                background: colors.purple,
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                ✓
              </div>
            )}
          </div>
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
              disabled={savingVenmo || (!venmoUsername.trim() && !user?.venmo_username) || venmoUsername === user?.venmo_username}
              style={{
                ...buttonStyles.small,
                width: 'auto',
                cursor: (savingVenmo || (!venmoUsername.trim() && !user?.venmo_username) || venmoUsername === user?.venmo_username) ? 'not-allowed' : 'pointer',
                opacity: (savingVenmo || (!venmoUsername.trim() && !user?.venmo_username) || venmoUsername === user?.venmo_username) ? 0.5 : 1
              }}
            >
              Save
            </button>
            {user?.venmo_username && (
              <button
                onClick={handleDeleteVenmo}
                disabled={savingVenmo}
                style={{
                  ...buttonStyles.small,
                  background: colors.error,
                  color: colors.text,
                  width: 'auto',
                  cursor: savingVenmo ? 'not-allowed' : 'pointer',
                  opacity: savingVenmo ? 0.5 : 1
                }}
              >
                ✕
              </button>
            )}
          </div>
          {venmoError ? (
            <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.text, marginTop: '5px', marginBottom: 0 }}>
              {venmoError}
            </p>
          ) : (
            <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.text, marginTop: '5px', marginBottom: 0 }}>
              Add your Venmo username to let others pay you directly via Venmo.
            </p>
          )}
          <p style={{ fontSize: typography.getFontSize('bodySmall', isMobile), color: colors.text, marginTop: '5px', marginBottom: 0 }}>
            Venmo links only work on mobile devices.
          </p>
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
            Connected with Google Account.
          </div>
        )}
        {!user?.google_id && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <label style={{ fontWeight: LABEL_FONT_WEIGHT, color: colors.text, fontSize: typography.getFontSize('label', isMobile) }}>
                Password
              </label>
              {passwordEmailSent && (
                <div style={{
                  background: colors.purple,
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </div>
              )}
            </div>
            <button
              onClick={async () => {
                setPasswordError('');
                setPasswordEmailSent(false);
                try {
                  await authAPI.requestPasswordChange();
                  setPasswordEmailSent(true);
                  setTimeout(() => setPasswordEmailSent(false), 3000);
                } catch (err: any) {
                  setPasswordError(err.response?.data?.error || 'Failed to send email');
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
            {passwordEmailSent ? (
              <p style={{ fontSize: typography.getFontSize('body', isMobile), color: colors.text, marginTop: '5px', fontWeight: LABEL_FONT_WEIGHT }}>
                Password reset email sent. Please check your spam folder.
              </p>
            ) : passwordError ? (
              <p style={{ fontSize: typography.getFontSize('body', isMobile), color: colors.text, marginTop: '5px' }}>
                {passwordError}
              </p>
            ) : (
              <p style={{ fontSize: typography.getFontSize('body', isMobile), color: colors.text, marginTop: '5px' }}>
                We'll send you an email with a secure link to change your password.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cookie Preferences Section */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text, fontSize: typography.getFontSize('h2', isMobile) }}>Cookie Preferences</h2>

        <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '15px' }}>
          Manage your cookie and analytics preferences. You can change these settings at any time.
        </p>

        <div style={{
          background: colors.surfaceLight,
          padding: '15px',
          borderRadius: BORDER_RADIUS,
          marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '10px' }}>
            <strong style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile) }}>
              Current Status:
            </strong>{' '}
            <span style={{
              color: cookieConsent === 'accepted' ? colors.purple : colors.text,
              fontSize: typography.getFontSize('body', isMobile),
              fontWeight: '600'
            }}>
              {cookieConsent === 'accepted' ? 'Analytics Enabled' : cookieConsent === 'declined' ? 'Analytics Disabled' : 'Not Set'}
            </span>
          </div>
          {cookieConsent === 'accepted' && (
            <p style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile), margin: 0 }}>
              Google Analytics is collecting anonymized usage data to help improve the app.
            </p>
          )}
          {cookieConsent === 'declined' && (
            <p style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile), margin: 0 }}>
              Only essential cookies are being used. No analytics data is collected.
            </p>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ color: colors.text, fontSize: typography.getFontSize('h3', isMobile), marginBottom: '10px' }}>
            Analytics Cookies (Optional)
          </h3>
          <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '15px' }}>
            We use Google Analytics to understand how people use our service. This data is anonymized and helps us improve the app.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleUpdateCookieConsent(true)}
              disabled={cookieConsent === 'accepted'}
              style={{
                padding: isMobile ? '10px 20px' : '12px 24px',
                background: cookieConsent === 'accepted' ? colors.purple : colors.surface,
                color: cookieConsent === 'accepted' ? '#fff' : colors.text,
                border: `2px solid ${cookieConsent === 'accepted' ? colors.purple : colors.border}`,
                borderRadius: BORDER_RADIUS,
                cursor: cookieConsent === 'accepted' ? 'not-allowed' : 'pointer',
                fontSize: typography.getFontSize('body', isMobile),
                fontWeight: '600',
                opacity: cookieConsent === 'accepted' ? 0.7 : 1
              }}
            >
              {cookieConsent === 'accepted' ? '✓ Enabled' : 'Enable Analytics'}
            </button>
            <button
              onClick={() => handleUpdateCookieConsent(false)}
              disabled={cookieConsent === 'declined'}
              style={{
                padding: isMobile ? '10px 20px' : '12px 24px',
                background: cookieConsent === 'declined' ? colors.textSecondary : colors.surface,
                color: colors.text,
                border: `2px solid ${cookieConsent === 'declined' ? colors.textSecondary : colors.border}`,
                borderRadius: BORDER_RADIUS,
                cursor: cookieConsent === 'declined' ? 'not-allowed' : 'pointer',
                fontSize: typography.getFontSize('body', isMobile),
                fontWeight: '600',
                opacity: cookieConsent === 'declined' ? 0.7 : 1
              }}
            >
              {cookieConsent === 'declined' ? '✓ Disabled' : 'Disable Analytics'}
            </button>
          </div>
        </div>

        <p style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile), marginTop: '15px', marginBottom: 0 }}>
          Essential cookies (for login and session management) cannot be disabled as they are required for the app to function.
          View our <a href="/privacy" style={{ color: colors.purple, textDecoration: 'underline' }}>Privacy Policy</a> for more details.
        </p>
      </div>

      {/* Data Export Section */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text, fontSize: typography.getFontSize('h2', isMobile) }}>Export Your Data</h2>

        <p style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: '15px' }}>
          Download all your data in JSON format, including your profile, events, bills, and payments.
        </p>

        <div style={{
          background: colors.surfaceLight,
          padding: '15px',
          borderRadius: BORDER_RADIUS,
          marginBottom: '20px'
        }}>
          <h3 style={{ color: colors.text, fontSize: typography.getFontSize('h3', isMobile), marginBottom: '8px' }}>
            What's included:
          </h3>
          <ul style={{ color: colors.text, fontSize: typography.getFontSize('body', isMobile), marginBottom: 0, paddingLeft: '24px' }}>
            <li>Your profile information (name, email, Venmo username)</li>
            <li>All events you've participated in</li>
            <li>All bills you've created or been part of</li>
          </ul>
        </div>

        <button
          onClick={handleExportData}
          disabled={exportingData}
          style={{
            padding: isMobile ? '10px 20px' : '12px 24px',
            background: colors.purple,
            color: '#fff',
            border: 'none',
            borderRadius: BORDER_RADIUS,
            cursor: exportingData ? 'not-allowed' : 'pointer',
            fontSize: typography.getFontSize('body', isMobile),
            fontWeight: '600',
            opacity: exportingData ? 0.6 : 1
          }}
        >
          {exportingData ? 'Exporting...' : 'Download My Data'}
        </button>

        <p style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile), marginTop: '15px', marginBottom: 0 }}>
          The exported file will contain all your data in a readable JSON format. This is part of your GDPR right to data portability.
        </p>
      </div>

      {/* Danger Zone */}
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
