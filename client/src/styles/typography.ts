// Centralized typography and spacing constants
export const typography = {
  // Font sizes - mobile first, desktop in comments
  h1: { mobile: '24px', desktop: '28px' },
  h2: { mobile: '20px', desktop: '22px' },
  h3: { mobile: '18px', desktop: '20px' },

  body: { mobile: '16px', desktop: '16px' },
  bodyLarge: { mobile: '16px', desktop: '16px' },
  bodySmall: { mobile: '14px', desktop: '14px' },

  label: { mobile: '16px', desktop: '16px' },
  button: { mobile: '18px', desktop: '18px' },
  caption: { mobile: '14px', desktop: '14px' },

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
