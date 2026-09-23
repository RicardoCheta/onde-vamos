import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const textColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: colors.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
