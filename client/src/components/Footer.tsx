import { colors } from '../styles/colors';
import { typography } from '../styles/typography';

interface FooterProps {
  isMobile: boolean;
}

export default function Footer({ isMobile }: FooterProps) {
  return (
    <footer style={{
      background: colors.surface,
      padding: isMobile ? '8px' : '10px',
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
  );
}
