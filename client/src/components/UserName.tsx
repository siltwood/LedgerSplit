import type { User } from '../types/index';
import { colors } from '../styles/colors';

interface UserNameProps {
  user?: User | { name: string; deleted_at?: string };
  fallback?: string;
}

export default function UserName({ user, fallback = 'Unknown' }: UserNameProps) {
  if (!user) {
    return <span>{fallback}</span>;
  }

  if (user.deleted_at) {
    return (
      <span
        style={{
          color: colors.textDisabled,
          textDecoration: 'line-through',
          cursor: 'help',
        }}
        title="Account deleted"
      >
        {user.name}
      </span>
    );
  }

  return <span>{user.name}</span>;
}
