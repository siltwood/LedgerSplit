import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../styles/colors';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  persistent?: boolean;
  settingsLink?: boolean;
  onDontShowAgain?: () => void;
}

export default function Toast({ message, onDismiss, persistent, settingsLink, onDontShowAgain }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isError = message.includes('✗');

  const triggerExit = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  // Auto-dismiss after 3.5s for non-persistent toasts
  useEffect(() => {
    if (persistent) return;
    timerRef.current = setTimeout(triggerExit, 3500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, persistent]);

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
        width: window.innerWidth < 600 ? '80vw' : 'auto',
        wordBreak: 'break-word',
        textAlign: 'left' as const,
        animation: exiting ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.3s ease-out',
      }}
    >
      {persistent && (
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
      )}
      <div style={persistent ? { paddingRight: '20px' } : undefined}>
        {settingsLink ? (
          <>
            Add your Venmo username in <Link to="/settings" onClick={triggerExit} style={{ color: '#fff', textDecoration: 'underline' }}>Settings</Link> so others can pay you directly.
          </>
        ) : message}
      </div>
      {settingsLink && (
        <div style={{ color: colors.textSecondary, fontSize: '11px', marginTop: '6px' }}>
          Venmo links only work on mobile.
        </div>
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
            color: '#fff',
            textDecoration: 'underline',
            fontSize: '11px',
            cursor: 'pointer',
            marginTop: '6px',
            padding: 0,
          }}
        >
          Do not show me again.
        </button>
      )}
    </div>
  );
}
