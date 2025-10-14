import { Link } from 'react-router-dom';
import { colors } from '../styles/colors';

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h1 style={{
          color: colors.text,
          fontSize: 'clamp(32px, 8vw, 48px)',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          LedgerSplit
        </h1>
        <p style={{
          color: colors.text,
          fontSize: 'clamp(16px, 4vw, 20px)',
          marginBottom: '40px',
          textAlign: 'center',
          maxWidth: '600px',
          padding: '0 10px'
        }}>
          Track expenses and split bills with friends
        </p>
        <div style={{
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          width: '100%',
          maxWidth: '400px',
          padding: '0 20px'
        }}>
          <Link
            to="/login"
            style={{
              padding: '12px 24px',
              fontSize: 'clamp(16px, 3vw, 18px)',
              background: colors.purple,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              flex: '1 1 140px',
              textAlign: 'center',
              minWidth: '120px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          >
            Login
          </Link>
          <Link
            to="/register"
            style={{
              padding: '12px 24px',
              fontSize: 'clamp(16px, 3vw, 18px)',
              background: colors.purple,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              flex: '1 1 140px',
              textAlign: 'center',
              minWidth: '120px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>

      <footer style={{
        background: colors.surface,
        padding: '15px 20px',
        textAlign: 'center',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{ color: colors.text, fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
          Need help? Contact us at{' '}
          <a href="mailto:hello@ledgersplit.com" style={{ color: colors.text, textDecoration: 'underline' }}>
            hello@ledgersplit.com
          </a>
        </div>
      </footer>
    </div>
  );
}
