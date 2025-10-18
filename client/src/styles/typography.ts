// Centralized typography and spacing constants
export const typography = {
  // Font sizes - mobile first, desktop in comments
  h1: { mobile: '24px', desktop: '28px' },
  h2: { mobile: '22px', desktop: '24px' },
  h3: { mobile: '20px', desktop: '22px' },

  body: { mobile: '20px', desktop: '20px' },
  bodyLarge: { mobile: '22px', desktop: '22px' },
  bodySmall: { mobile: '20px', desktop: '20px' },

  label: { mobile: '20px', desktop: '20px' },
  button: { mobile: '20px', desktop: '20px' },
  caption: { mobile: '20px', desktop: '20px' },

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
