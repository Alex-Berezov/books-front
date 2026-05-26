/**
 * Design Tokens - for use in TypeScript
 */

export const colors = {
  // Primary
  primary: '#1890ff',
  primaryHover: '#40a9ff',
  primaryActive: '#096dd9',
  primaryDisabled: '#d9d9d9',

  // Semantic
  success: '#52c41a',
  successHover: '#73d13d',
  warning: '#faad14',
  warningHover: '#ffc53d',
  error: '#ff4d4f',
  errorHover: '#ff7875',
  info: '#1890ff',
  infoHover: '#40a9ff',

  // Background
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f0f0f0',
  backgroundTertiary: '#fafafa',
  backgroundDark: '#001529',
  backgroundDarkSecondary: '#002140',

  // Text
  textPrimary: 'rgba(0, 0, 0, 0.85)',
  textSecondary: 'rgba(0, 0, 0, 0.45)',
  textTertiary: 'rgba(0, 0, 0, 0.25)',
  textDisabled: 'rgba(0, 0, 0, 0.25)',
  textInverse: '#ffffff',

  // Border
  borderLight: '#f0f0f0',
  borderBase: '#d9d9d9',
  borderDark: '#434343',

  // Public Site (BIBLIARIS)
  publicPrimary: 'oklch(0.55 0.13 68)',
  publicPrimaryForeground: 'oklch(0.99 0.005 75)',
  bibliarisGreen: 'oklch(0.28 0.04 140)',
  bibliarisGreenForeground: 'oklch(0.95 0.01 80)',
  gold: 'oklch(0.72 0.16 80)',
  goldForeground: 'oklch(0.2 0.04 65)',
  publicBackground: 'oklch(0.98 0.008 75)',
  publicForeground: 'oklch(0.2 0.02 60)',

  // Public Site Dark Mode
  publicPrimaryDark: 'oklch(0.65 0.14 70)',
  bibliarisGreenDark: 'oklch(0.22 0.04 140)',
  goldDark: 'oklch(0.68 0.15 78)',
  publicBackgroundDark: 'oklch(0.14 0.015 60)',
  publicForegroundDark: 'oklch(0.95 0.01 75)',
} as const;

export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  xxl: '3rem', // 48px
} as const;

export const borderRadius = {
  sm: '2px',
  base: '4px',
  lg: '8px',
  xl: '12px',
  round: '50%',
} as const;

export const fontSize = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.5rem', // 24px
  xxl: '2rem', // 32px
  xxxl: '2.5rem', // 40px
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const shadows = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 12px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 24px rgba(0, 0, 0, 0.16)',
  xl: '0 12px 48px rgba(0, 0, 0, 0.20)',
} as const;

export const transitions = {
  fast: '0.15s ease-in-out',
  base: '0.3s ease-in-out',
  slow: '0.5s ease-in-out',
} as const;

export const zIndex = {
  dropdown: 1000,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

export const breakpoints = {
  xs: 480,
  sm: 768,
  md: 1024,
  lg: 1280,
  xl: 1536,
} as const;

// Type exports
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type FontSizeToken = keyof typeof fontSize;
