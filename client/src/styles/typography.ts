// Centralized typography and spacing constants
export const typography = {
  // Font sizes - mobile first, desktop in comments
  h1: { mobile: '20px', desktop: '24px' },       // Reduced from 22/28
  h2: { mobile: '18px', desktop: '20px' },       // Reduced from 20/22
  h3: { mobile: '16px', desktop: '18px' },       // Reduced from 18/20

  body: { mobile: '14px', desktop: '16px' },     // Reduced from 16/18
  bodyLarge: { mobile: '16px', desktop: '18px' }, // Reduced from 18/20
  bodySmall: { mobile: '12px', desktop: '14px' }, // Reduced from 14/16

  label: { mobile: '14px', desktop: '16px' },    // Reduced from 16/18
  button: { mobile: '14px', desktop: '16px' },   // Reduced from 16/18
  caption: { mobile: '12px', desktop: '13px' },  // New smaller size

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
  },

  // Helper function to get responsive font size
  getFontSize: (size: 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'bodySmall' | 'label' | 'button' | 'caption', isMobile: boolean) => {
    return isMobile ? typography[size].mobile : typography[size].desktop;
  },
} as const;
