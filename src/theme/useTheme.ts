import { useColorScheme } from 'react-native';
import { darkColors, lightColors, radius, spacing } from './colors';

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, spacing, radius, scheme: scheme ?? 'light' };
}
