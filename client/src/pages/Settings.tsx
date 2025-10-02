import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { friendsAPI, authAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [allFriends, setAllFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const friendsRes = await friendsAPI.getAll();
      const allUsers = friendsRes.data.friends || [];

      setAllFriends(allUsers.filter((f: any) => f.status === 'accepted'));
      setBlockedUsers(allUsers.filter((f: any) => f.status === 'blocked'));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (friendId: string) => {
    try {
      await friendsAPI.block(friendId);
      setStatus('User blocked');
      loadData();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Failed to block user');
    }
  };

  const handleUnblock = async (friendId: string) => {
    try {
      await friendsAPI.unblock(friendId);
      setStatus('User unblocked');
      loadData();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Failed to unblock user');
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

  if (loading) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
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
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Name
          </label>
          <div style={{ fontSize: '18px', color: colors.text }}>{user?.name}</div>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Email
          </label>
          <div style={{ fontSize: '18px', color: colors.text }}>{user?.email}</div>
        </div>
        {user?.google_id && (
          <div style={{
            padding: '10px',
            background: colors.surfaceLight,
            borderRadius: '4px',
            marginTop: '15px',
            fontSize: '16px',
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
                fontSize: '16px'
              }}
            >
              Change Password
            </button>
            <p style={{ fontSize: '16px', color: colors.text, marginTop: '5px' }}>
              We'll send you an email with a secure link to change your password
            </p>
          </div>
        )}
      </div>

      {/* Privacy Section */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text }}>Privacy & Blocking</h2>

        {status && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            background: colors.success,
            color: colors.text,
            borderRadius: '4px',
            fontSize: '16px'
          }}>
            {status}
          </div>
        )}

        {/* Block Users */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', color: colors.text }}>Block Users</h3>
          <p style={{ color: colors.text, fontSize: '16px', marginBottom: '15px' }}>
            Blocked users won't be able to invite you to groups or add you to expenses.
          </p>

          {allFriends.length === 0 ? (
            <p style={{ color: colors.text, fontSize: '16px' }}>No friends to block</p>
          ) : (
            <div>
              {allFriends.map((friend: any) => (
                <div key={friend.friend_id} style={{
                  padding: '12px',
                  background: colors.surfaceLight,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <strong style={{ color: colors.text }}>{friend.friend?.name}</strong>
                    <div style={{ fontSize: '16px', color: colors.text }}>
                      {friend.friend?.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleBlock(friend.friend_id)}
                    style={{
                      padding: '6px 12px',
                      background: colors.error,
                      color: colors.text,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Block
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Blocked Users */}
        {blockedUsers.length > 0 && (
          <div>
            <h3 style={{ fontSize: '18px', color: colors.text }}>Blocked Users ({blockedUsers.length})</h3>
            <div>
              {blockedUsers.map((blocked: any) => (
                <div key={blocked.friend_id} style={{
                  padding: '12px',
                  background: colors.warning,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  marginBottom: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <strong style={{ color: colors.text }}>{blocked.friend?.name}</strong>
                    <div style={{ fontSize: '16px', color: colors.text }}>
                      {blocked.friend?.email}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(blocked.friend_id)}
                    style={{
                      padding: '6px 12px',
                      background: colors.success,
                      color: colors.text,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data & Privacy */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text }}>Data & Privacy</h2>
        <div style={{ color: colors.text, fontSize: '16px', lineHeight: '1.6' }}>
          <p>• Your expense data is private and only visible to group members</p>
          <p>• You control who can invite you to groups</p>
          <p>• Blocked users cannot see your activity or add you to new expenses</p>
          <p>• Your email is only visible to your friends and group members</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{
        background: colors.error,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: colors.text }}>Danger Zone</h2>
        <p style={{ color: colors.text, fontSize: '16px', marginBottom: '15px' }}>
          Once you delete your account, there is no going back. Your name will be grayed out in
          expenses, but your data will remain for other users' records.
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
              fontSize: '16px'
            }}
          >
            Delete Account
          </button>
        ) : (
          <div>
            <p style={{ fontWeight: 'bold', marginBottom: '10px', color: colors.text, fontSize: '16px' }}>
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
                  fontSize: '16px',
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
                  fontSize: '16px'
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
