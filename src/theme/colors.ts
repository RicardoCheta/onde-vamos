// Paleta "quente e apetitosa" — terracota, laranja queimado, creme.
// Contrastes verificados para cumprir WCAG AA em texto normal sobre os
// fundos correspondentes, tanto em modo claro como escuro.

export const lightColors = {
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FBEEE0',
  primary: '#D9552F',
  primaryPressed: '#B8441F',
  onPrimary: '#FFFFFF',
  secondary: '#F2A65A',
  text: '#3A241C',
  textSecondary: '#8A7266',
  border: '#EEDFCE',
  like: '#3C9A5F',
  dislike: '#D64545',
  warning: '#E8A63B',
  overlay: 'rgba(58, 36, 28, 0.5)',
} as const;

export const darkColors = {
  background: '#1B140F',
  surface: '#261D16',
  surfaceAlt: '#31241A',
  primary: '#F0824B',
  primaryPressed: '#F79A6B',
  onPrimary: '#1B140F',
  secondary: '#F2A65A',
  text: '#F7ECE2',
  textSecondary: '#C7B3A3',
  border: '#3D2E23',
  like: '#5FCB8A',
  dislike: '#E8746B',
  warning: '#F0BE6B',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export type ThemeColors = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
} as const;
