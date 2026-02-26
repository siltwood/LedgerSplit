import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../styles/colors';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  settingsLink?: boolean;
  onDontShowAgain?: () => void;
}

export default function Toast({ message, onDismiss, settingsLink, onDontShowAgain }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  const isError = message.includes('✗');

  const triggerExit = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '16px 24px',
        background: isError ? colors.error : colors.purple,
        color: '#fff',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: '700',
        border: '4px solid #000',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        whiteSpace: 'pre-line',
        maxWidth: 'calc(100vw - 40px)',
        width: 'auto',
        wordBreak: 'break-word',
        textAlign: 'center',
        animation: exiting ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.3s ease-out',
      }}
    >
      <button
        onClick={triggerExit}
        style={{
          position: 'absolute',
          top: '6px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontSize: '20px',
          fontWeight: '900',
          cursor: 'pointer',
          lineHeight: 1,
          padding: '2px 4px',
        }}
      >
        ✕
      </button>
      <div style={{ paddingRight: '20px' }}>
        {message}
      </div>
      {settingsLink && (
        <Link
          to="/settings"
          onClick={triggerExit}
          style={{
            color: '#fff',
            textDecoration: 'underline',
            fontSize: '16px',
            fontWeight: '600',
            display: 'block',
            marginTop: '8px',
          }}
        >
          Go to Settings
        </Link>
      )}
      {onDontShowAgain && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDontShowAgain();
            triggerExit();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: colors.textSecondary,
            fontSize: '11px',
            cursor: 'pointer',
            marginTop: '8px',
            padding: 0,
          }}
        >
          Do not show me again.
        </button>
      )}
    </div>
  );
}
