import { colors } from '../styles/colors';
import { typography } from '../styles/typography';
import { BORDER_RADIUS, LABEL_FONT_WEIGHT } from '../styles/constants';

interface ErrorMessageProps {
  message: string;
  isMobile: boolean;
}

export default function ErrorMessage({ message, isMobile }: ErrorMessageProps) {
  return (
    <div style={{
      padding: '20px',
      background: colors.error,
      color: colors.text,
      borderRadius: BORDER_RADIUS,
      marginBottom: '20px',
      fontSize: typography.getFontSize('h2', isMobile),
      fontWeight: LABEL_FONT_WEIGHT,
      textAlign: 'center'
    }}>
      {message}
    </div>
  );
}
