import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../services/api';
import type { Group } from '../types/index';
import { colors } from '../styles/colors';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupDetails, setGroupDetails] = useState<Record<string, any>>({});
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [platformInviteEmail, setPlatformInviteEmail] = useState('');
  const [showPlatformInvite, setShowPlatformInvite] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await groupsAPI.getAll();
      setGroups(response.data.groups.map((g: any) => g.groups));
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupDetails = async (groupId: string) => {
    try {
      const response = await groupsAPI.getById(groupId);
      setGroupDetails(prev => ({ ...prev, [groupId]: response.data }));
    } catch (error) {
      console.error('Failed to load group details:', error);
    }
  };

  const toggleGroup = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      if (!groupDetails[groupId]) {
        loadGroupDetails(groupId);
      }
    }
  };

  const handleInvite = async (groupId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!inviteEmail) {
      setInviteStatus('Please enter an email');
      return;
    }

    try {
      await groupsAPI.inviteUser(groupId, inviteEmail);
      setInviteStatus('Invite sent!');
      setInviteEmail('');
      setSelectedGroupId(null);
      setTimeout(() => setInviteStatus(''), 3000);
    } catch (err: any) {
      setInviteStatus(err.response?.data?.error || 'Failed to send invite');
    }
  };

  const handlePlatformInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformInviteEmail) return;

    try {
      // This will use the friend invite which sends email if user doesn't exist
      const { friendsAPI } = await import('../services/api');
      await friendsAPI.sendRequest(platformInviteEmail);
      setInviteStatus('Platform invitation sent!');
      setPlatformInviteEmail('');
      setShowPlatformInvite(false);
      setTimeout(() => setInviteStatus(''), 3000);
    } catch (err: any) {
      setInviteStatus(err.response?.data?.error || 'Failed to send invite');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Remove this member? Their expenses will also be deleted.')) {
      return;
    }

    try {
      await groupsAPI.removeMember(groupId, userId);
      setInviteStatus('Member removed');
      loadGroupDetails(groupId);
      setTimeout(() => setInviteStatus(''), 3000);
    } catch (err: any) {
      setInviteStatus(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ margin: 0 }}>Groups</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowPlatformInvite(!showPlatformInvite)}
            style={{
              padding: '10px 20px',
              background: colors.primary,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Invite to Platform
          </button>
          <Link to="/groups/new">
            <button style={{
              padding: '10px 20px',
              background: colors.success,
              color: colors.text,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              Create Group
            </button>
          </Link>
        </div>
      </div>

      {/* Platform Invite Modal */}
      {showPlatformInvite && (
        <div style={{
          background: colors.surface,
          padding: '20px',
          borderRadius: '8px',
          border: `1px solid ${colors.border}`,
          marginBottom: '20px'
        }}>
          <h3 style={{ marginTop: 0 }}>Invite Someone to Join LedgerSplit</h3>
          <p style={{ color: colors.textSecondary, fontSize: '14px' }}>
            They'll receive an email invitation to create an account.
          </p>
          <form onSubmit={handlePlatformInvite} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="email"
              value={platformInviteEmail}
              onChange={(e) => setPlatformInviteEmail(e.target.value)}
              placeholder="Enter their email"
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
              Send Invite
            </button>
            <button
              type="button"
              onClick={() => setShowPlatformInvite(false)}
              style={{
                padding: '10px 20px',
                background: colors.textSecondary,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {inviteStatus && (
        <div style={{
          padding: '10px',
          marginBottom: '15px',
          background: inviteStatus.includes('sent') ? colors.success : colors.error,
          color: colors.text,
          borderRadius: '4px'
        }}>
          {inviteStatus}
        </div>
      )}

      {groups.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>No groups yet. Create one to get started!</p>
      ) : (
        <div>
          {groups.map((group) => {
            const isCreator = group.created_by === user?.id;
            const isExpanded = expandedGroupId === group.group_id;
            const details = groupDetails[group.group_id];

            return (
              <div key={group.group_id} style={{
                padding: '20px',
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <div onClick={() => toggleGroup(group.group_id)} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>{group.name}</h3>
                    <span style={{ fontSize: '20px' }}>{isExpanded ? '▼' : '▶'}</span>
                  </div>
                  {group.description && (
                    <p style={{ margin: 0, color: colors.textSecondary }}>{group.description}</p>
                  )}
                  <div style={{ fontSize: '14px', color: colors.textSecondary, marginTop: '10px' }}>
                    Created {new Date(group.created_at).toLocaleDateString()}
                    {isCreator && <span style={{ marginLeft: '10px', color: colors.success }}>• You're the creator</span>}
                  </div>
                </div>

                {/* Members section (only when expanded) */}
                {isExpanded && details && (
                  <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>Members ({details.members?.length || 0})</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {details.members?.map((member: any) => (
                        <div key={member.user_id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          background: colors.surfaceLight,
                          borderRadius: '4px'
                        }}>
                          <span>
                            {member.users?.name}
                            {member.user_id === group.created_by && (
                              <span style={{ marginLeft: '8px', fontSize: '12px', color: colors.textSecondary }}>(Creator)</span>
                            )}
                          </span>
                          {isCreator && member.user_id !== group.created_by && (
                            <button
                              onClick={(e) => handleRemoveMember(group.group_id, member.user_id, e)}
                              style={{
                                padding: '4px 8px',
                                background: colors.error,
                                color: colors.text,
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invite section */}
                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: `1px solid ${colors.border}` }} onClick={(e) => e.stopPropagation()}>
                {selectedGroupId === group.group_id ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email to invite"
                      style={{
                        flex: 1,
                        padding: '8px',
                        border: `1px solid ${colors.border}`,
                        borderRadius: '4px'
                      }}
                    />
                    <button
                      onClick={(e) => handleInvite(group.group_id, e)}
                      style={{
                        padding: '8px 16px',
                        background: colors.primary,
                        color: colors.text,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Send
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGroupId(null);
                        setInviteEmail('');
                      }}
                      style={{
                        padding: '8px 16px',
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
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGroupId(group.group_id);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: colors.surfaceLight,
                      color: colors.primary,
                      border: `1px solid ${colors.primary}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    + Invite Member
                  </button>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}