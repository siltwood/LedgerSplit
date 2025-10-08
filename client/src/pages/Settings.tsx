import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Settings</h1>

      {/* Profile Section */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text }}>Profile</h2>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '20px' }}>
            Name
          </label>
          <div style={{ fontSize: '22px', color: colors.text }}>{user?.name}</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '20px' }}>
            Email
          </label>
          <div style={{ fontSize: '22px', color: colors.text }}>{user?.email}</div>
        </div>
        {user?.google_id && (
          <div style={{
            padding: '10px',
            background: colors.surfaceLight,
            borderRadius: '4px',
            marginTop: '15px',
            fontSize: '20px',
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
                padding: '8px 16px',
                background: colors.primary,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              Change Password
            </button>
            <p style={{ fontSize: '20px', color: colors.text, marginTop: '5px' }}>
              We'll send you an email with a secure link to change your password
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
          borderRadius: '4px',
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
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text }}>Danger Zone</h2>
        <p style={{ color: colors.text, fontSize: '20px', marginBottom: '15px' }}>
          Once you delete your account, there is no going back. Your name will be grayed out in
          splits, but your data will remain for other users' records.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px',
              background: colors.background,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', color: colors.text, fontSize: '20px' }}>
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
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '20px',
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
                  borderRadius: '4px',
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
