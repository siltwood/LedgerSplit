import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { groupsAPI } from '../services/api';
import type { Group } from '../types/index';

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Groups</h1>
        <Link to="/groups/new">
          <button style={{
            padding: '10px 20px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Create Group
          </button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <p style={{ color: '#6c757d' }}>No groups yet. Create one to get started!</p>
      ) : (
        <div>
          {groups.map((group) => (
            <Link
              key={group.group_id}
              to={`/groups/${group.group_id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                padding: '20px',
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '15px',
                cursor: 'pointer'
              }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{group.name}</h3>
                {group.description && (
                  <p style={{ margin: 0, color: '#6c757d' }}>{group.description}</p>
                )}
                <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '10px' }}>
                  Created {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}