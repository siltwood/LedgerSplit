import { useEffect, useState } from 'react';
import { friendsAPI, eventsAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function Friends() {
  const [friends, setFriends] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
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

      // Load event invites
      try {
        const invitesRes = await eventsAPI.getMyInvites();
        setInvites(invitesRes.data.invites || []);
      } catch (err) {
        console.log('No event invites');
      }
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

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await eventsAPI.acceptInvite(inviteId);
      loadData();
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await eventsAPI.declineInvite(inviteId);
      loadData();
    } catch (error) {
      console.error('Failed to decline invite:', error);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>Friends</h1>

      {/* Event Invites */}
      {invites.length > 0 && (
        <div style={{
          background: colors.warning,
          border: `1px solid ${colors.border}`,
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: colors.text }}>Event Invites ({invites.length})</h3>
          {invites.map((invite: any) => (
            <div key={invite.invite_id} style={{
              background: colors.surface,
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ color: colors.text, fontSize: '16px' }}>
                <strong>{invite.inviter?.name}</strong> invited you to{' '}
                <strong>{invite.events?.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleAcceptInvite(invite.invite_id)}
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
                  Accept
                </button>
                <button
                  onClick={() => handleDeclineInvite(invite.invite_id)}
                  style={{
                    padding: '6px 12px',
                    background: colors.textDisabled,
                    color: colors.text,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Friend */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: colors.text }}>Add Friend</h3>
        {status && (
          <div style={{
            padding: '10px',
            marginBottom: '15px',
            background: status.includes('sent') ? colors.success : colors.error,
            color: colors.text,
            borderRadius: '4px',
            fontSize: '16px'
          }}>
            {status}
          </div>
        )}
        <form onSubmit={handleSendRequest} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Enter friend's email"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              fontSize: '16px',
              color: colors.text
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
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Send Request
          </button>
        </form>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: colors.text }}>Pending Requests ({pendingRequests.length})</h3>
          {pendingRequests.map((request: any) => (
            <div key={request.friend_id} style={{
              padding: '15px',
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <strong style={{ color: colors.text }}>{request.friend?.name}</strong>
                <div style={{ fontSize: '16px', color: colors.text }}>
                  {request.friend?.email}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleAccept(request.friend_id)}
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
                    cursor: 'pointer',
                    fontSize: '16px'
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
      <h3 style={{ color: colors.text }}>Your Friends ({friends.length})</h3>
      {friends.length === 0 ? (
        <p style={{ color: colors.text, fontSize: '16px' }}>No friends yet. Send a friend request to get started!</p>
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
                onClick={() => handleRemove(friend.friend_id)}
                style={{
                  padding: '6px 12px',
                  background: colors.textSecondary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
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
