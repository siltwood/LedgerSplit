// Blue/gray color palette
export const colors = {
  // Base palette
  columbiaBlue: '#bcd4de',     // hsla(198, 34%, 80%, 1)
  lightBlue: '#a5ccd1',        // hsla(187, 32%, 73%, 1)
  cadetGray: '#a0b9bf',        // hsla(192, 19%, 69%, 1)
  cadetGray2: '#9dacb2',       // hsla(197, 12%, 66%, 1)
  cadetGray3: '#949ba0',       // hsla(205, 6%, 60%, 1)

  // Extended palette (more blue/gray variations)
  powderBlue: '#d4e4ec',       // lighter blue
  skyBlue: '#87b5c4',          // deeper blue
  slateGray: '#6b8894',        // darker blue-gray
  steelBlue: '#7a9ca8',        // medium steel blue
  dustyBlue: '#b8c9d1',        // dusty blue
  stormGray: '#8a9ba3',        // storm gray

  // Semantic mappings (using only the 5 colors above)
  primary: '#a5ccd1',          // Light blue
  primaryDark: '#a0b9bf',      // Cadet gray
  primaryLight: '#bcd4de',     // Columbia blue

  secondary: '#a0b9bf',        // Cadet gray
  secondaryDark: '#9dacb2',    // Cadet gray 2
  secondaryLight: '#a5ccd1',   // Light blue

  accent: '#bcd4de',           // Columbia blue
  accentDark: '#a5ccd1',       // Light blue
  accentLight: '#bcd4de',      // Columbia blue

  background: '#bcd4de',       // Columbia blue (lightest)
  surface: '#a5ccd1',          // Light blue
  surfaceLight: '#bcd4de',     // Columbia blue

  text: '#000000',             // Black
  textSecondary: '#949ba0',    // Cadet gray 3
  textDisabled: '#9dacb2',     // Cadet gray 2

  success: '#a5ccd1',          // Light blue
  error: '#9dacb2',            // Cadet gray 2
  warning: '#a0b9bf',          // Cadet gray
  info: '#a5ccd1',             // Light blue

  border: '#9dacb2',           // Cadet gray 2
  divider: '#a0b9bf',          // Cadet gray

  // Special (only using the 5 colors)
  shadow: 'rgba(148, 155, 160, 0.5)',   // Cadet gray 3
  overlay: 'rgba(148, 155, 160, 0.7)',  // Cadet gray 3

  // Accent colors
  purple: '#915984',  // Purple accent for selections and highlights
} as const;

export type ColorName = keyof typeof colors;
