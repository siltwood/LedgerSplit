import { useState, useEffect } from 'react';
import { colors } from '../styles/colors';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    // Reload page to load analytics script
    window.location.reload();
  };

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const isMobile = window.innerWidth < 600;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: colors.surface,
      border: `2px solid ${colors.border}`,
      borderBottom: 'none',
      padding: isMobile ? '16px' : '20px',
      boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'stretch' : 'center',
      gap: isMobile ? '12px' : '20px',
      justifyContent: 'space-between'
    }}>
      <div style={{
        flex: 1,
        color: colors.text,
        fontSize: isMobile ? '16px' : '18px',
        lineHeight: '1.5'
      }}>
        We use cookies to analyze traffic and improve your experience. By clicking "Accept", you consent to our use of cookies.{' '}
        <a
          href="/privacy"
          style={{
            color: colors.purple,
            textDecoration: 'underline'
          }}
        >
          Learn more
        </a>
      </div>
      <div style={{
        display: 'flex',
        gap: '12px',
        flexDirection: isMobile ? 'column' : 'row',
        flexShrink: 0
      }}>
        <button
          onClick={handleDecline}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            background: colors.surface,
            color: colors.text,
            border: `2px solid ${colors.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: isMobile ? '10px 20px' : '10px 24px',
            background: colors.purple,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
