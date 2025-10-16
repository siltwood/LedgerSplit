import { colors } from '../styles/colors';
import { useState } from 'react';

interface CaretProps {
  direction: 'up' | 'down';
  onClick?: () => void;
}

export default function Caret({ direction, onClick }: CaretProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '6px 12px',
        paddingBottom: '10px',
        background: colors.purple,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        opacity: isHovered ? 0.8 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {direction === 'up' ? '▲' : '▼'}
    </div>
  );
}
