/**
 * Momentum's visual language: a dark arcade cabinet.
 *
 * Dark ground makes the reward moments (XP bursts, loot flares) read as light
 * sources rather than just more colour. Every accent below is tuned to stay
 * legible on `bg` and `surface`.
 */

export const colors = {
  bg: '#0B0B14',
  surface: '#141425',
  surfaceHi: '#1D1D33',
  border: '#2A2A45',

  text: '#F2F2F8',
  textDim: '#9B9BB5',
  textFaint: '#63637E',

  // Primary energy colour — XP, level, the "go" signal.
  primary: '#7C5CFF',
  primaryDim: '#4B3399',

  // Currency.
  gold: '#FFC53D',
  goldDim: '#8A6B1F',

  // Momentum meter.
  flame: '#FF6B35',
  flameDim: '#8A3A1C',

  // Success / completion.
  green: '#34D399',
  greenDim: '#1B6B51',

  danger: '#FF4D6D',

  // Attribute colours, one per category.
  body: '#FF6B6B',
  mind: '#4FC3F7',
  focus: '#7C5CFF',
  social: '#FFB86C',
  grit: '#34D399',
} as const;

/** Loot rarity ramp — deliberately steep so a legendary *looks* rare. */
export const rarityColors = {
  common: '#8A8AA3',
  rare: '#4FC3F7',
  epic: '#B980FF',
  legendary: '#FFC53D',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
} as const;

export const font = {
  // System stacks only — no font loading, so the first frame is never blank.
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 15, fontWeight: '500' as const },
  small: { fontSize: 13, fontWeight: '600' as const },
  micro: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8 },
};
