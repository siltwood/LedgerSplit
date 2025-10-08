import { colors } from './colors';

export const buttonStyles = {
  primary: {
    padding: '12px 24px',
    background: colors.primary,
    color: colors.text,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '500'
  },
  secondary: {
    padding: '12px 24px',
    background: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '500'
  },
  danger: {
    padding: '12px 24px',
    background: colors.error,
    color: colors.text,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '20px',
    fontWeight: '500'
  },
  small: {
    padding: '8px 16px',
    background: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  }
} as const;
