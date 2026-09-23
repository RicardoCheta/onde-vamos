import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  const { colors, spacing, radius } = useTheme();

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[styles.label, { color: colors.text }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.dislike : colors.border,
            color: colors.text,
            borderRadius: radius.sm,
            paddingHorizontal: spacing.md,
          },
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={[styles.error, { color: colors.dislike }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    fontSize: 16,
  },
  error: {
    fontSize: 13,
    marginTop: 4,
  },
});
