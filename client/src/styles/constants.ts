export const UI_CONSTANTS = {
  // Font sizes
  fontSize: {
    input: '16px',
    button: '18px',
    label: '18px',
    body: '18px',
    small: '16px',
  },

  // Input styles
  input: {
    padding: '8px',
    borderRadius: '4px',
  },

  // Button styles
  button: {
    padding: '10px 20px',
    borderRadius: '4px',
  },

  // Modal styles
  modal: {
    buttonPadding: '10px 20px',
    fontSize: '18px',
    textFontSize: '18px',
  },
} as const;

// Standard input style helper
export const getInputStyle = (colors: any, isMobile?: boolean) => ({
  width: '100%',
  padding: isMobile ? '6px' : '8px',
  fontSize: UI_CONSTANTS.fontSize.input,
  border: `1px solid ${colors.border}`,
  borderRadius: '4px',
  background: colors.surface,
  color: colors.text,
  outline: 'none',
});
