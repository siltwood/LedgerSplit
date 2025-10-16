import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttons';
import { typography } from '../styles/typography';

export default function Landing() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h1 style={{
          color: colors.text,
          fontSize: typography.getFontSize('h1', isMobile),
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          LedgerSplit
        </h1>
        <p style={{
          color: colors.text,
          fontSize: typography.getFontSize('bodyLarge', isMobile),
          marginBottom: '40px',
          textAlign: 'center',
          maxWidth: '600px',
          padding: '0 10px'
        }}>
          Track expenses and split bills with friends
        </p>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          alignItems: 'center',
          width: '100%',
          maxWidth: '400px',
          padding: '0 20px'
        }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              ...buttonStyles.primary,
              padding: '12px 24px',
              fontSize: typography.getFontSize('button', isMobile),
              width: '100%',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{
              ...buttonStyles.primary,
              padding: '12px 24px',
              fontSize: typography.getFontSize('button', isMobile),
              width: '100%',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
              textAlign: 'center'
            }}
          >
            Sign Up
          </button>
        </div>
      </div>

      <footer style={{
        background: colors.surface,
        padding: '15px 20px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{ color: colors.text, fontSize: typography.getFontSize('bodySmall', isMobile) }}>
          Need help? Contact us at{' '}
          <a href="mailto:hello@ledgersplit.com" style={{ color: colors.text, textDecoration: 'underline' }}>
            hello@ledgersplit.com
          </a>
        </div>
      </footer>
    </div>
  );
}
