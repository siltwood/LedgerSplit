import { colors } from './colors';

export const buttonStyles = {
  primary: {
    padding: '10px 20px',
    background: colors.purple,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    width: '100%' as const,
    maxWidth: '100%',
    display: 'block'
  },
  secondary: {
    padding: '10px 20px',
    background: colors.purple,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    width: '100%' as const,
    maxWidth: '100%',
    display: 'block'
  },
  danger: {
    padding: '10px 20px',
    background: colors.error,
    color: colors.text,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    width: '100%' as const,
    maxWidth: '100%',
    display: 'block'
  },
  small: {
    padding: '8px 16px',
    background: colors.purple,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600'
  }
} as const;

// Helper function to get responsive button width styling
// Desktop: 250px max-width, Mobile: full width
export const getResponsiveButtonWidth = (isMobile: boolean) => ({
  width: isMobile ? '100%' : 'auto',
  maxWidth: isMobile ? '100%' : '250px'
});

// Helper function for responsive checkbox/card width
// Desktop: 300px max-width, Mobile: full width
export const getResponsiveCardWidth = (isMobile: boolean) => ({
  width: isMobile ? '100%' : 'auto',
  maxWidth: isMobile ? '100%' : '300px'
});
