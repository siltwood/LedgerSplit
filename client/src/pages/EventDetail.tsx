import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsAPI, splitsAPI, friendsAPI } from '../services/api';
import type { Event, Split } from '../types/index';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [splits, setSplits] = useState<Split[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inviteStatus, setInviteStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      const [eventRes, splitsRes, friendsRes] = await Promise.all([
        eventsAPI.getById(id),
        splitsAPI.getAll({ event_id: id }),
        friendsAPI.getAll(),
      ]);

      setEvent(eventRes.data.event);
      setSplits(splitsRes.data.splits || []);
      setFriends(friendsRes.data.friends || []);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteFriends = async () => {
    if (!id || selectedFriends.length === 0) return;

    try {
      for (const friendId of selectedFriends) {
        await eventsAPI.inviteToEvent(id, friendId);
      }
      setInviteStatus(`Invited ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
      setSelectedFriends([]);
      setShowInviteModal(false);
      setTimeout(() => setInviteStatus(''), 3000);
      loadData();
    } catch (error: any) {
      setInviteStatus(error.response?.data?.error || 'Failed to invite friends');
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleDeleteSplit = async (splitId: string) => {
    if (!window.confirm('Delete this split?')) return;

    try {
      await splitsAPI.delete(splitId);
      loadData();
    } catch (error) {
      console.error('Failed to delete split:', error);
    }
  };

  if (loading) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Loading...</div>;
  if (!event) return <div style={{ padding: '20px', color: colors.text, fontSize: '16px' }}>Event not found</div>;

  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const isCreator = event.created_by === user?.id;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px 16px',
            background: colors.surface,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '10px',
            fontSize: '16px'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Event Info */}
      <div style={{
        background: colors.surface,
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`,
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: colors.text }}>{event.name}</h1>
        {event.description && (
          <p style={{ color: colors.text, margin: '0 0 15px 0', fontSize: '16px' }}>
            {event.description}
          </p>
        )}

        <div style={{ display: 'flex', gap: '20px', fontSize: '16px', color: colors.text, flexWrap: 'wrap' }}>
          <div>
            {event.participants?.length || 0} participant{event.participants?.length !== 1 ? 's' : ''}
          </div>
          <div>
            Total: ${totalAmount.toFixed(2)}
          </div>
        </div>

        {event.participants && event.participants.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <strong style={{ fontSize: '16px', color: colors.text }}>Participants:</strong>
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {event.participants.map((p) => (
                <span
                  key={p.user_id}
                  style={{
                    padding: '4px 8px',
                    background: colors.surfaceLight,
                    borderRadius: '4px',
                    fontSize: '16px',
                    color: colors.text
                  }}
                >
                  {p.user?.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {inviteStatus && (
        <div style={{
          padding: '10px',
          background: inviteStatus.includes('Failed') ? colors.error : colors.success,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {inviteStatus}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Link to={`/events/${id}/splits/new`}>
          <button style={{
            padding: '12px 24px',
            background: colors.primary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            + New Split
          </button>
        </Link>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '12px 24px',
            background: colors.secondary,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Invite Friends
        </button>
        <Link to="/friends">
          <button style={{
            padding: '12px 24px',
            background: colors.secondaryLight,
            color: colors.text,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            Add Friends
          </button>
        </Link>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: colors.background,
            padding: '30px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ color: colors.text, marginBottom: '20px' }}>Invite Friends to Event</h2>

            {friends.length === 0 ? (
              <div style={{ color: colors.text, marginBottom: '20px', fontSize: '16px' }}>
                You don't have any friends yet. Add friends first!
              </div>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {friends
                  .filter(f => !event.participants?.some(p => p.user_id === f.friend.user_id))
                  .map((friend) => (
                    <label
                      key={friend.friend.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        background: colors.surface,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '10px',
                        border: `2px solid ${selectedFriends.includes(friend.friend.user_id) ? colors.primary : colors.border}`
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.friend.user_id)}
                        onChange={() => toggleFriend(friend.friend.user_id)}
                        style={{ cursor: 'pointer', width: '20px', height: '20px' }}
                      />
                      <span style={{ color: colors.text, fontSize: '14px' }}>
                        {friend.friend.name}
                      </span>
                    </label>
                  ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleInviteFriends}
                disabled={selectedFriends.length === 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: colors.primary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedFriends.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: selectedFriends.length === 0 ? 0.5 : 1,
                  fontSize: '16px'
                }}
              >
                Invite Selected
              </button>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedFriends([]);
                }}
                style={{
                  padding: '12px 20px',
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
        </div>
      )}

      {/* Splits List */}
      <div>
        <h2 style={{ marginBottom: '20px', color: colors.text }}>Splits</h2>
        {splits.length === 0 ? (
          <div style={{
            padding: '40px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            textAlign: 'center',
            color: colors.text,
            fontSize: '16px'
          }}>
            No splits yet. Create one to get started!
          </div>
        ) : (
          <div>
            {splits.map((split) => (
              <div
                key={split.split_id}
                style={{
                  padding: '15px',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', flexWrap: 'wrap', gap: '10px' }}>
                      <strong style={{ fontSize: '18px', color: colors.text }}>{split.title}</strong>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: colors.text }}>
                        ${split.amount.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ fontSize: '16px', color: colors.text }}>
                      Paid by {split.paid_by_user.name} on {new Date(split.date).toLocaleDateString()}
                    </div>
                    {split.split_participants && split.split_participants.length > 0 && (
                      <div style={{ fontSize: '16px', color: colors.text, marginTop: '8px' }}>
                        Split between: {split.split_participants.map(p => p.user?.name).join(', ')}
                      </div>
                    )}
                    {split.notes && (
                      <div style={{ fontSize: '16px', color: colors.text, marginTop: '5px', fontStyle: 'italic' }}>
                        {split.notes}
                      </div>
                    )}
                  </div>
                  {(isCreator || split.created_by === user?.id) && (
                    <button
                      onClick={() => handleDeleteSplit(split.split_id)}
                      style={{
                        padding: '6px 12px',
                        background: colors.error,
                        color: colors.text,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginLeft: '10px'
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
