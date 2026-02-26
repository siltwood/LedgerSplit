import { useEffect, useRef, useState } from 'react';
import { colors } from '../styles/colors';

interface ToastProps {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, onDismiss, duration = 3500 }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const isError = message.includes('✗');

  const triggerExit = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  // Auto-dismiss after duration
  useEffect(() => {
    timerRef.current = setTimeout(triggerExit, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [message, duration]);

  return (
    <div
      onClick={triggerExit}
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
        cursor: 'pointer',
        textAlign: 'center',
        animation: exiting ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.3s ease-out',
      }}
    >
      {message}
    </div>
  );
}
