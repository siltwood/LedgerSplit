import { colors } from './colors';

export const buttonStyles = {
  primary: {
    padding: '10px 20px',
    background: colors.primary,
    color: colors.text,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '500',
    width: '100%' as const,
    maxWidth: '100%',
    display: 'block'
  },
  secondary: {
    padding: '10px 20px',
    background: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '500',
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
    fontWeight: '500',
    width: '100%' as const,
    maxWidth: '100%',
    display: 'block'
  },
  small: {
    padding: '8px 16px',
    background: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '500'
  }
} as const;
