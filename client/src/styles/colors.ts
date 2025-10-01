// Earthy retro color palette - ONLY these 5 colors allowed
export const colors = {
  // Base palette (ONLY these colors)
  peachYellow: '#e1ca96',      // hsla(42, 56%, 74%, 1)
  sage: '#aca885',             // hsla(54, 19%, 60%, 1)
  battleshipGray: '#918b76',   // hsla(47, 11%, 52%, 1)
  ebony: '#626c66',            // hsla(144, 5%, 40%, 1)
  blackOlive: '#434a42',       // hsla(113, 6%, 27%, 1)

  // Semantic mappings (using only the 5 colors above)
  primary: '#aca885',          // Sage
  primaryDark: '#918b76',      // Battleship gray
  primaryLight: '#e1ca96',     // Peach yellow

  secondary: '#918b76',        // Battleship gray
  secondaryDark: '#626c66',    // Ebony
  secondaryLight: '#aca885',   // Sage

  accent: '#e1ca96',           // Peach yellow
  accentDark: '#aca885',       // Sage
  accentLight: '#e1ca96',      // Peach yellow

  background: '#434a42',       // Black olive
  surface: '#626c66',          // Ebony
  surfaceLight: '#918b76',     // Battleship gray

  text: '#e1ca96',             // Peach yellow
  textSecondary: '#aca885',    // Sage
  textDisabled: '#918b76',     // Battleship gray

  success: '#aca885',          // Sage
  error: '#626c66',            // Ebony (darker = error)
  warning: '#e1ca96',          // Peach yellow
  info: '#918b76',             // Battleship gray

  border: '#918b76',           // Battleship gray
  divider: '#626c66',          // Ebony

  // Special (only using the 5 colors)
  shadow: 'rgba(67, 74, 66, 0.5)',      // Black olive
  overlay: 'rgba(67, 74, 66, 0.7)',     // Black olive
} as const;

export type ColorName = keyof typeof colors;
