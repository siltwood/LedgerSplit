import { useEffect, useState } from 'react';
import { friendsAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function Friends() {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        friendsAPI.getAll(),
        friendsAPI.getPending(),
      ]);
      setFriends(friendsRes.data.friends || []);
      setPendingRequests(pendingRes.data.requests || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    try {
      await friendsAPI.sendRequest(inviteEmail);
      setStatus('Friend request sent!');
      setInviteEmail('');
      loadData();
      setTimeout(() => setStatus(''), 3000);
    } catch (err: any) {
      setStatus(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleAccept = async (friendId: string) => {
    try {
      await friendsAPI.accept(friendId);
      loadData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleRemove = async (friendId: string) => {
    try {
      await friendsAPI.remove(friendId);
      loadData();
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Friends</h1>

      {/* Add Friend */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0 }}>Add Friend</h3>
        {status && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            background: status.includes('sent') ? colors.success : colors.error,
            color: colors.text,
            borderRadius: '4px'
          }}>
            {status}
          </div>
        )}
        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter friend's email"
            style={{
              flex: 1,
              padding: '10px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Send Request
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3>Pending Requests ({pendingRequests.length})</h3>
          {pendingRequests.map((request: any) => (
            <div key={request.friend_id} style={{
              padding: '15px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{request.friend?.name}</strong>
                <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                  {request.friend?.email}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleAccept(request.friend_id)}
                  style={{
                    padding: '6px 12px',
                    background: colors.success,
                    color: colors.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRemove(request.friend_id)}
                  style={{
                    padding: '6px 12px',
                    background: colors.error,
                    color: colors.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends List */}
      <h3>Your Friends ({friends.length})</h3>
      {friends.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>No friends yet. Send a friend request to get started!</p>
      ) : (
        <div>
          {friends.map((friend: any) => (
            <div key={friend.friend_id} style={{
              padding: '15px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{friend.friend?.name}</strong>
                <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                  {friend.friend?.email}
                </div>
              </div>
              <button
                onClick={() => handleRemove(friend.friend_id)}
                style={{
                  padding: '6px 12px',
                  background: colors.textSecondary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
