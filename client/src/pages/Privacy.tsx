import { Link } from 'react-router-dom';
import { colors } from '../styles/colors';
import { useState, useEffect } from 'react';

export default function Privacy() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.background,
      padding: isMobile ? '20px' : '40px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: colors.surface,
        padding: isMobile ? '20px' : '40px',
        borderRadius: '8px',
        border: `1px solid ${colors.border}`
      }}>
        <h1 style={{
          color: colors.text,
          fontSize: isMobile ? '28px' : '36px',
          marginBottom: '20px'
        }}>
          Privacy Policy
        </h1>

        <p style={{ color: colors.text, fontSize: '16px', marginBottom: '20px', opacity: 0.8 }}>
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            What We Collect
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            LedgerSplit collects the following information:
          </p>
          <ul style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px' }}>
            <li>Account information (email, name, password).</li>
            <li>Event and expense data you create.</li>
            <li>Usage data through Google Analytics (if you consent).</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            How We Use Cookies
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            We use two types of cookies:
          </p>

          <h3 style={{ color: colors.text, fontSize: '20px', marginBottom: '8px', marginTop: '16px' }}>
            1. Essential Cookies (Required)
          </h3>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            These cookies are necessary for the website to function and cannot be disabled:
          </p>
          <ul style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px', marginBottom: '12px' }}>
            <li><strong>Authentication cookies:</strong> Keep you logged in to your account.</li>
            <li><strong>Session storage:</strong> Store temporary data like form inputs.</li>
          </ul>

          <h3 style={{ color: colors.text, fontSize: '20px', marginBottom: '8px', marginTop: '16px' }}>
            2. Analytics Cookies (Optional)
          </h3>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            With your consent, we use Google Analytics to understand how people use our service:
          </p>
          <ul style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px', marginBottom: '12px' }}>
            <li><strong>Google Analytics:</strong> Tracks page views, user interactions, and helps us improve the app.</li>
            <li><strong>Data collected:</strong> Pages visited, time spent, browser type, approximate location (city-level).</li>
            <li><strong>Your control:</strong> You can decline analytics cookies and the app will work exactly the same.</li>
          </ul>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6' }}>
            Google Analytics data is anonymized and never sold to third parties.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            Your Data Rights
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            You have the right to:
          </p>
          <ul style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px' }}>
            <li>Access your personal data.</li>
            <li>Correct inaccurate data.</li>
            <li>Delete your account and all associated data.</li>
            <li>Export your data.</li>
            <li>Withdraw cookie consent at any time.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            Data Security
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6' }}>
            We take security seriously. Your password is hashed using bcrypt, and all data is stored securely on Supabase servers. We use HTTPS encryption for all data transmission.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            Account Deletion
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6' }}>
            You can delete your account at any time from the Settings page. When you delete your account:
          </p>
          <ul style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px', marginTop: '12px' }}>
            <li>Your email is changed to a system-generated address (deleted_[id]@ledgersplit.com).</li>
            <li>Your password and login credentials are permanently deleted.</li>
            <li>Your name remains visible in events you participated in (displayed with strikethrough and "Account deleted" label).</li>
            <li>You can no longer log in or access your account.</li>
            <li>Event history with your participation is preserved for other users.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            Managing Cookie Preferences
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6', marginBottom: '12px' }}>
            To change your cookie preferences:
          </p>
          <ol style={{ color: colors.text, fontSize: '18px', lineHeight: '1.8', paddingLeft: '24px' }}>
            <li>Clear your browser's localStorage for this site.</li>
            <li>Refresh the page.</li>
            <li>The cookie consent banner will appear again.</li>
          </ol>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', marginBottom: '12px' }}>
            Contact
          </h2>
          <p style={{ color: colors.text, fontSize: '18px', lineHeight: '1.6' }}>
            If you have questions about this privacy policy or want to exercise your data rights, contact us at hello@ledgersplit.com.
          </p>
        </section>

        <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: `1px solid ${colors.border}` }}>
          <Link
            to="/"
            style={{
              color: colors.purple,
              fontSize: '18px',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
