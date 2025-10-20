import { colors } from '../styles/colors';

interface CaretProps {
  direction: 'up' | 'down';
  onClick?: () => void;
}

export default function Caret({ direction, onClick }: CaretProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '4px 8px',
        background: colors.purple,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        flexShrink: 0,
        cursor: 'pointer'
      }}
    >
      {direction === 'up' ? '▲' : '▼'}
    </div>
  );
}
