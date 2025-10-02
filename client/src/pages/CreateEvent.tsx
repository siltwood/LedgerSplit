import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI, friendsAPI } from '../services/api';
import { colors } from '../styles/colors';

export default function CreateEvent() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const friendsRes = await friendsAPI.getAll();
      setFriends(friendsRes.data.friends || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
      setError('Failed to load friends. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await eventsAPI.create({
        name,
        description: description || undefined,
        participant_ids: selectedFriends,
      });

      console.log('Event created:', response);
      navigate('/events');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter(id => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  };

  return (
    <div style={{ maxWidth: '700px', padding: '20px' }}>
      <h1 style={{ color: colors.text, marginBottom: '20px' }}>New Event</h1>

      {error && (
        <div style={{
          padding: '10px',
          background: colors.error,
          color: colors.text,
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '16px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Event Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Weekend Trip, Concert, Dinner Party, etc."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details about the event..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              background: colors.surface,
              color: colors.text,
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', color: colors.text, fontSize: '16px' }}>
            Participants
          </label>
          {friends.length === 0 ? (
            <div style={{
              padding: '15px',
              background: colors.warning,
              borderRadius: '4px',
              marginBottom: '10px'
            }}>
              <p style={{ margin: 0, color: colors.text, fontSize: '16px' }}>You don't have any friends yet.</p>
              <button
                type="button"
                onClick={() => navigate('/friends')}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  background: colors.primary,
                  color: colors.text,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Add Friends
              </button>
            </div>
          ) : (
            <>
              <div style={{
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                padding: '10px',
                maxHeight: '200px',
                overflowY: 'auto',
                background: colors.surface
              }}>
                {friends.map((friend: any) => (
                  <div key={friend.friend_id} style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedFriends.includes(friend.friend_id)}
                        onChange={() => toggleFriend(friend.friend_id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ color: colors.text, fontSize: '16px' }}>{friend.friend?.name}</span>
                      <span style={{ fontSize: '16px', color: colors.text, marginLeft: '8px' }}>
                        ({friend.friend?.email})
                      </span>
                    </label>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '16px', color: colors.text, marginTop: '5px' }}>
                {selectedFriends.length} participant{selectedFriends.length !== 1 ? 's' : ''} selected
                {selectedFriends.length === 0 && ' (you will be the only participant)'}
              </div>
            </>
          )}
        </div>

        <div style={{
          background: colors.surfaceLight,
          padding: '15px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '16px', color: colors.text }}>
            <strong>Note:</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0 }}>
              <li>You will automatically be added as a participant</li>
              <li>You can add more participants later</li>
              <li>All participants can add splits to this event</li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              minWidth: '150px',
              padding: '12px',
              fontSize: '16px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              background: colors.textSecondary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
